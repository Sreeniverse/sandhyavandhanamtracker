import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:sreeni@asthikasamaj.com";
const FCM_SERVICE_ACCOUNT_B64 = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const TITLES: Record<string, string> = {
  morning: "Prathakala Sandhyavandhanam",
  afternoon: "Madhyanika Sandhyavandhanam",
  evening: "Saayamkala Sandhyavandhanam",
};

function parentBody(slot: string): string {
  return `Time for your ${TITLES[slot]}. Open app.`;
}

function sonBody(slot: string, sonName: string): string {
  return `${sonName} time for your ${TITLES[slot]}. Open app.`;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let fcmAccessToken: string | null = null;
let fcmTokenExpiry = 0;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFCMAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmAccessToken && now < fcmTokenExpiry - 60) return fcmAccessToken;

  if (!FCM_SERVICE_ACCOUNT_B64) throw new Error("FCM_SERVICE_ACCOUNT_JSON not configured");

  const serviceAccount = JSON.parse(atob(FCM_SERVICE_ACCOUNT_B64));
  const privateKey = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;
  const projectId = serviceAccount.project_id;

  const pemBody = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyBytes = base64ToBytes(pemBody);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const header = { alg: "RS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: nowSec + 3600,
    iat: nowSec,
  };

  const headerB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const claimB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claim)));
  const toSign = `${headerB64}.${claimB64}`;

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign),
  );
  const sigB64 = bytesToBase64Url(new Uint8Array(sig));
  const jwt = `${toSign}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM OAuth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  fcmAccessToken = data.access_token;
  fcmTokenExpiry = now + (data.expires_in || 3600);
  return fcmAccessToken;
}

async function sendFCM(
  token: string,
  title: string,
  body: string,
  url: string,
  slot: string,
): Promise<boolean> {
  try {
    const accessToken = await getFCMAccessToken();
    const serviceAccount = JSON.parse(atob(FCM_SERVICE_ACCOUNT_B64));
    const projectId = serviceAccount.project_id;

    const message: Record<string, unknown> = {
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          channel_id: "reminders",
          icon: "ic_stat_logo",
          color: "#FF9933",
        },
      },
      data: { url, slot },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    if (res.ok) return true;

    const err = await res.json();
    const errorCode = (err as any)?.error?.details?.[0]?.errorCode || "";
    if (errorCode === "UNREGISTERED" || errorCode === "SENDER_ID_MISMATCH") {
      await supabase.from("push_subscriptions").delete().eq("endpoint", token);
    }
    return false;
  } catch {
    return false;
  }
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url: string,
): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
    return true;
  } catch (err: any) {
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    }
    return false;
  }
}

function getLocalHour(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).formatToParts(date);
    return parseInt(parts.find((p) => p.type === "hour")!.value);
  } catch {
    return -1;
  }
}

function getLocalMinute(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      minute: "numeric",
      timeZone: timezone,
    }).formatToParts(date);
    return parseInt(parts.find((p) => p.type === "minute")!.value);
  } catch {
    return -1;
  }
}

function slotForUser(now: Date, timezone: string): string | null {
  const hour = getLocalHour(now, timezone);
  const minute = getLocalMinute(now, timezone);
  if (hour < 0) return null;

  // 9:00-9:59 AM
  if (hour === 9) return "morning";
  // 12:30-12:59 PM
  if (hour === 12 && minute >= 30) return "afternoon";
  // 6:30-6:59 PM
  if (hour === 18 && minute >= 30) return "evening";

  return null;
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET") || "";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: enabledPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id, timezone")
      .eq("enabled", true);

    const enabledUsers = enabledPrefs || [];

    if (enabledUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine which slot each user is in based on their timezone
    const userSlots = new Map<string, string>();
    for (const u of enabledUsers) {
      const tz = u.timezone || "Asia/Kolkata";
      const slot = slotForUser(now, tz);
      if (slot) {
        userSlots.set(u.user_id, slot);
      }
    }

    if (userSlots.size === 0) {
      return new Response(JSON.stringify({ message: "No users in reminder windows" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const pushUserIds = [...userSlots.keys()];

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth_key, platform")
      .in("user_id", pushUserIds);

    const enabledSubs = subscriptions || [];

    if (enabledSubs.length === 0) {
      return new Response(JSON.stringify({ message: "No push subscriptions found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch own activities for these users
    const { data: ownActivities } = await supabase
      .from("activities")
      .select("user_id, morning_done, afternoon_done, evening_done")
      .in("user_id", pushUserIds)
      .eq("date", today)
      .is("profile_for", null);

    const ownActivityMap = new Map<string, any>();
    for (const act of ownActivities || []) {
      ownActivityMap.set(act.user_id, act);
    }

    // Fetch family members and their activities
    const { data: allFamilyMembers } = await supabase
      .from("family_members")
      .select("id, parent_id, name")
      .in("parent_id", pushUserIds);

    const familyByParent = new Map<string, { id: string; name: string }[]>();
    for (const fm of allFamilyMembers || []) {
      const list = familyByParent.get(fm.parent_id) || [];
      list.push({ id: fm.id, name: fm.name });
      familyByParent.set(fm.parent_id, list);
    }

    const allFamilyIds = (allFamilyMembers || []).map((fm: any) => fm.id);
    let famActivities: any[] = [];
    let familyActivityMap = new Map<string, Map<string, any>>();

    if (allFamilyIds.length > 0) {
      const { data: famData } = await supabase
        .from("activities")
        .select("user_id, profile_for, morning_done, afternoon_done, evening_done")
        .in("user_id", pushUserIds)
        .in("profile_for", allFamilyIds)
        .eq("date", today);

      famActivities = famData || [];

      for (const act of famActivities) {
        const userMap = familyActivityMap.get(act.user_id) || new Map();
        userMap.set(act.profile_for, act);
        familyActivityMap.set(act.user_id, userMap);
      }
    }

    let fcmSent = 0, fcmFailed = 0, webSent = 0, webFailed = 0;

    for (const sub of enabledSubs) {
      const userSlot = userSlots.get(sub.user_id);
      if (!userSlot) continue;

      const own = ownActivityMap.get(sub.user_id);
      const ownDone = own ? own[`${userSlot}_done`] : false;

      let title = "";
      let body = "";

      if (ownDone) {
        // Own ritual is done - check sons
        const sons = familyByParent.get(sub.user_id) || [];
        const famMap = familyActivityMap.get(sub.user_id) || new Map();

        let foundPendingSon = false;
        for (const son of sons) {
          const sonAct = famMap.get(son.id);
          const sonDone = sonAct ? sonAct[`${userSlot}_done`] : false;
          if (!sonDone) {
            title = TITLES[userSlot];
            body = sonBody(userSlot, son.name);
            foundPendingSon = true;
            break;
          }
        }
        if (!foundPendingSon) continue; // All done for this slot
      } else {
        title = TITLES[userSlot];
        body = parentBody(userSlot);
      }

      if (sub.platform === "android") {
        const ok = await sendFCM(sub.endpoint, title, body, "/", userSlot);
        if (ok) fcmSent++;
        else fcmFailed++;
      } else {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        };
        const ok = await sendWebPush(pushSub, title, body, "/");
        if (ok) webSent++;
        else webFailed++;
      }
    }

    return new Response(JSON.stringify({
      message: "Reminders processed",
      fcm: { sent: fcmSent, failed: fcmFailed },
      webpush: { sent: webSent, failed: webFailed },
      usersProcessed: pushUserIds.length,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

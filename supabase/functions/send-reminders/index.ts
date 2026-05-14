import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:sreeni@asthikasamaj.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64url);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url: string }
): Promise<boolean> {
  try {
    const sub = subscription as unknown as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Encode the VAPID private key (assumes raw base64 from env)
    const vapidPrivateKeyBytes = base64ToUint8Array(VAPID_PRIVATE_KEY);

    // Import VAPID key for signing
    const key = await crypto.subtle.importKey(
      "raw",
      vapidPrivateKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    // Build the push message
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(JSON.stringify(payload));

    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
      },
      body: payloadBytes,
    });

    return response.status >= 200 && response.status < 300;
  } catch (err) {
    console.error("Failed to send push:", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Verify internal call via Authorization header
  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("CRON_SECRET") || "";

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const istHours = (now.getUTCHours() + 5 + (now.getUTCMinutes() >= 30 ? 0.5 : 0)) % 24;

    const isMorning = istHours >= 9 && istHours < 11; // Remind until 11am
    const isAfternoon = istHours >= 13 && istHours < 15; // Remind until 3pm
    const isEvening = istHours >= 18 && istHours < 20; // Remind until 8pm

    const slotsToCheck: string[] = [];
    if (isMorning) slotsToCheck.push("morning");
    if (isAfternoon) slotsToCheck.push("afternoon");
    if (isEvening) slotsToCheck.push("evening");

    if (slotsToCheck.length === 0) {
      return new Response(JSON.stringify({ message: "Outside reminder windows", istHours }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Fetch push subscriptions for users with notifications enabled
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth_key")
      .eq("notification_preferences.enabled", true)
      .join("notification_preferences", "notification_preferences.user_id", "push_subscriptions.user_id");

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ message: "No subscriptions found", error: subError }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // For each subscribed user, check if they have incomplete slots
    let sent = 0;
    for (const sub of subscriptions) {
      const { data: activity } = await supabase
        .from("activities")
        .select("morning_done, afternoon_done, evening_done")
        .eq("user_id", sub.user_id)
        .eq("date", today)
        .maybeSingle();

      for (const slot of slotsToCheck) {
        const done = activity ? activity[`${slot}_done`] : false;
        if (!done) {
          const titles: Record<string, string> = {
            morning: "Prathakala Sandhyavandhanam",
            afternoon: "Madhyanika Sandhyavandhanam",
            evening: "Saayamkala Sandhyavandhanam",
          };
          const bodies: Record<string, string> = {
            morning: "Time for your morning prayer. Open the app!",
            afternoon: "Time for your noon prayer. Open the app!",
            evening: "Time for your evening prayer. Open the app!",
          };

          const ok = await sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            { title: titles[slot], body: bodies[slot], url: "/" }
          );

          if (ok) sent++;
        }
      }
    }

    return new Response(JSON.stringify({ message: "Reminders sent", sent, slots: slotsToCheck, istHours }), {
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

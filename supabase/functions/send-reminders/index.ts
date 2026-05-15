import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildPushPayload } from "npm:@block65/webcrypto-web-push@1.0.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:sreeni@asthikasamaj.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const vapidKeys = {
  subject: VAPID_EMAIL,
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
};

Deno.serve(async (req: Request) => {
  // Auth: only validate if CRON_SECRET is provided AND the caller claims to be
  // our cron job. Skip auth for any other Authorization header (dashboard testing)
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET") || "";

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Authenticated cron call - proceed
  } else if (authHeader && authHeader.startsWith("Bearer ey")) {
    // Dashboard or other Supabase auth token - allow for testing
  } else if (authHeader) {
    // Some other auth header that doesn't match - reject
    return new Response("Unauthorized", { status: 401 });
  }
  // No auth header at all - allow (for simple testing)

  try {
    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istMs = utcMs + (5 * 60 + 30) * 60000;
    const istDate = new Date(istMs);
    const istHour = istDate.getHours();
    const istMinute = istDate.getMinutes();

    const isMorning = istHour >= 9 && istHour < 11;
    const isAfternoon = istHour >= 13 && istHour < 15;
    const isEvening = istHour >= 18 && istHour < 20;

    const slotsToCheck: string[] = [];
    if (isMorning) slotsToCheck.push("morning");
    if (isAfternoon) slotsToCheck.push("afternoon");
    if (isEvening) slotsToCheck.push("evening");

    if (slotsToCheck.length === 0) {
      return new Response(JSON.stringify({ message: "Outside reminder windows", istHour, istMinute }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Fetch push subscriptions for users with notifications enabled
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth_key, notification_preferences(enabled)")
      .eq("notification_preferences.enabled", true);

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ message: "No subscriptions found", error: subError }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter to only enabled subscriptions
    const enabledSubs = subscriptions.filter(
      (s: any) => s.notification_preferences?.enabled
    );

    if (enabledSubs.length === 0) {
      return new Response(JSON.stringify({ message: "No enabled subscriptions" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Batch fetch all activities for subscribed users
    const userIds = [...new Set(enabledSubs.map((s: any) => s.user_id))];
    const { data: activities } = await supabase
      .from("activities")
      .select("user_id, morning_done, afternoon_done, evening_done")
      .in("user_id", userIds)
      .eq("date", today);

    // Build a map of user_id -> activity for quick lookup
    const activityMap = new Map();
    for (const act of activities || []) {
      activityMap.set(act.user_id, act);
    }

    // Send notifications
    let sent = 0;
    let failed = 0;
    for (const sub of enabledSubs) {
      const activity = activityMap.get(sub.user_id);

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

          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              expirationTime: null,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth_key,
              },
            };

            const message = {
              data: JSON.stringify({ title: titles[slot], body: bodies[slot], url: "/" }),
              options: { ttl: 86400 },
            };

            const payload = await buildPushPayload(message, pushSubscription, vapidKeys);
            const response = await fetch(pushSubscription.endpoint, payload);

            if (response.status >= 200 && response.status < 300) {
              sent++;
            } else if (response.status === 410 || response.status === 404) {
              // Subscription expired or gone - remove it
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
              failed++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Reminders sent", sent, failed, slots: slotsToCheck, istHour, istMinute }), {
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
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildPushPayload } from "npm:@block65/webcrypto-web-push@1.0.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:sreeni@asthikasamaj.com";
// const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
// const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "sreeni@asthikasamaj.com";
// const APP_URL = Deno.env.get("APP_URL") || "https://nithyakarmatracker.netlify.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const vapidKeys = {
  subject: VAPID_EMAIL,
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
};

const TITLES: Record<string, string> = {
  morning: "Prathakala Sandhyavandhanam",
  afternoon: "Madhyanika Sandhyavandhanam",
  evening: "Saayamkala Sandhyavandhanam",
};

const BODIES: Record<string, string> = {
  morning: "Time for your morning prayer. Open the app!",
  afternoon: "Time for your noon prayer. Open the app!",
  evening: "Time for your evening prayer. Open the app!",
};

const TIME_WINDOWS: Record<string, string> = {
  morning: "8:30 - 10:30 AM IST",
  afternoon: "11:30 AM - 1:00 PM IST",
  evening: "6:30 - 8:00 PM IST",
};

const SLOT_COLORS: Record<string, string> = {
  morning: "#F59E0B",
  afternoon: "#EF4444",
  evening: "#6366F1",
};

function buildEmailHtml(name: string, slot: string): string {
  const color = SLOT_COLORS[slot] || "#F59E0B";
  const title = TITLES[slot];
  const timeWindow = TIME_WINDOWS[slot];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF7ED;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid ${color};">
      <h1 style="font-size:22px;color:#1a1a1a;margin:0;">Sandhyavandhanam</h1>
    </div>
    <div style="padding:24px 0;text-align:center;">
      <p style="font-size:16px;color:#666;margin:0 0 8px;">Namaste, <strong style="color:#1a1a1a;">${name}</strong></p>
      <p style="font-size:14px;color:#888;margin:0 0 24px;">It's time for your ritual practice</p>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #E5E7EB;">
        <h2 style="font-size:20px;color:${color};margin:0 0 8px;">${title}</h2>
        <p style="font-size:14px;color:#666;margin:0;">Time window: ${timeWindow}</p>
      </div>
    </div>
    <div style="text-align:center;padding-top:16px;">
      <a href="${APP_URL}" style="display:inline-block;background:${color};color:white;text-decoration:none;padding:12px 32px;border-radius:24px;font-weight:700;font-size:14px;">Open App</a>
    </div>
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:32px;">
      You received this because email reminders are enabled for your account.
      Manage preferences in the app under Profile &gt; Preferences.
    </p>
  </div>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET") || "";

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Authenticated cron call
  } else if (authHeader && authHeader.startsWith("Bearer ey")) {
    // Dashboard or other Supabase auth token
  } else if (authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istMs = utcMs + (5 * 60 + 30) * 60000;
    const istDate = new Date(istMs);
    const istHour = istDate.getHours();
    const istMinute = istDate.getMinutes();

    const isMorning = istHour >= 8 && istHour < 11;
    const isAfternoon = istHour >= 11 && istHour < 13;
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

    // --- PUSH NOTIFICATIONS ---
    let pushSent = 0;
    let pushFailed = 0;

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth_key, notification_preferences(enabled)")
      .eq("notification_preferences.enabled", true);

    const enabledSubs = (subscriptions || []).filter(
      (s: any) => s.notification_preferences?.enabled
    );

    if (enabledSubs.length > 0) {
      const pushUserIds = [...new Set(enabledSubs.map((s: any) => s.user_id))];
      const { data: pushActivities } = await supabase
        .from("activities")
        .select("user_id, morning_done, afternoon_done, evening_done")
        .in("user_id", pushUserIds)
        .eq("date", today);

      const activityMap = new Map();
      for (const act of pushActivities || []) {
        activityMap.set(act.user_id, act);
      }

      for (const sub of enabledSubs) {
        const activity = activityMap.get(sub.user_id);
        for (const slot of slotsToCheck) {
          const done = activity ? activity[`${slot}_done`] : false;
          if (!done) {
            try {
              const pushSubscription = {
                endpoint: sub.endpoint,
                expirationTime: null,
                keys: { p256dh: sub.p256dh, auth: sub.auth_key },
              };
              const message = {
                data: JSON.stringify({ title: TITLES[slot], body: BODIES[slot], url: "/" }),
                options: { ttl: 86400 },
              };
              const payload = await buildPushPayload(message, pushSubscription, vapidKeys);
              const response = await fetch(pushSubscription.endpoint, payload);

              if (response.status >= 200 && response.status < 300) {
                pushSent++;
              } else if (response.status === 410 || response.status === 404) {
                await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
                pushFailed++;
              } else {
                pushFailed++;
              }
            } catch {
              pushFailed++;
            }
          }
        }
      }
    }

    // --- EMAIL NOTIFICATIONS (commented out - client opted out) ---
    // let emailsSent = 0;
    // let emailsFailed = 0;
    //
    // if (BREVO_API_KEY) {
    //   const { data: emailPrefs } = await supabase
    //     .from("notification_preferences")
    //     .select("user_id, profiles(name, email)")
    //     .eq("email_enabled", true);
    //
    //   if (emailPrefs && emailPrefs.length > 0) {
    //     const emailUserIds = emailPrefs.map((e: any) => e.user_id);
    //     const { data: emailActivities } = await supabase
    //       .from("activities")
    //       .select("user_id, morning_done, afternoon_done, evening_done")
    //       .in("user_id", emailUserIds)
    //       .eq("date", today);
    //
    //     const emailActivityMap = new Map();
    //     for (const act of emailActivities || []) {
    //       emailActivityMap.set(act.user_id, act);
    //     }
    //
    //     for (const ep of emailPrefs) {
    //       const userName = ep.profiles?.name || "Devotee";
    //       const userEmail = ep.profiles?.email;
    //       if (!userEmail) continue;
    //
    //       const activity = emailActivityMap.get(ep.user_id);
    //       for (const slot of slotsToCheck) {
    //         const done = activity ? activity[`${slot}_done`] : false;
    //         if (!done) {
    //           try {
    //             const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    //               method: "POST",
    //               headers: {
    //                 "Content-Type": "application/json",
    //                 "api-key": BREVO_API_KEY,
    //               },
    //               body: JSON.stringify({
    //                 sender: { name: "Sandhyavandhanam", email: SENDER_EMAIL },
    //                 to: [{ email: userEmail, name: userName }],
    //                 subject: `Reminder: ${TITLES[slot]}`,
    //                 htmlContent: buildEmailHtml(userName, slot),
    //               }),
    //             });
    //
    //             if (res.ok) {
    //               emailsSent++;
    //             } else {
    //               const errBody = await res.text();
    //               console.error(`Brevo email failed for ${userEmail}:`, res.status, errBody);
    //               emailsFailed++;
    //             }
    //           } catch (err) {
    //             console.error(`Brevo email error for ${userEmail}:`, err);
    //             emailsFailed++;
    //           }
    //         }
    //       }
    //     }
    //   }
    // }

    return new Response(JSON.stringify({
      message: "Reminders processed",
      push: { sent: pushSent, failed: pushFailed },
      slots: slotsToCheck,
      istHour,
      istMinute,
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
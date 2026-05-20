-- Add platform column to push_subscriptions for FCM (android) vs Web Push (web)
-- Run in Supabase SQL Editor or via `supabase db push`

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';

-- Indexes for edge function queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_platform
ON push_subscriptions(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform
ON push_subscriptions(platform);

-- Grant service_role access (needed for edge functions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO service_role;
GRANT SELECT ON public.activities TO service_role;
GRANT SELECT ON public.family_members TO service_role;

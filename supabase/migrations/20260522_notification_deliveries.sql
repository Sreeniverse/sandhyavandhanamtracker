-- Track successful reminder sends so the scheduled edge function can run
-- frequently without sending duplicate notifications in the same local day.

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'afternoon', 'evening')),
  platform TEXT NOT NULL DEFAULT 'web',
  endpoint TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, reminder_date, slot, platform, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_date
ON public.notification_deliveries(user_id, reminder_date);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification deliveries"
ON public.notification_deliveries;

CREATE POLICY "Users can view own notification deliveries"
  ON public.notification_deliveries FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_deliveries TO service_role;

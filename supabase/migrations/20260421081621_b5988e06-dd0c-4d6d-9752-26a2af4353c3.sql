-- Add deleted_at column for soft-delete
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at);

-- Auto-purge function: permanently delete bookings trashed more than 30 days ago
CREATE OR REPLACE FUNCTION public.purge_old_trashed_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bookings
  WHERE deleted_at IS NOT NULL
    AND deleted_at < (now() - INTERVAL '30 days');
END;
$$;

-- Schedule daily cleanup using pg_cron (enable extension if not yet)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if any, then schedule new one
DO $$
BEGIN
  PERFORM cron.unschedule('purge-old-trashed-bookings');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-old-trashed-bookings',
  '0 3 * * *',
  $$SELECT public.purge_old_trashed_bookings();$$
);

-- Add "proceed" to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'proceed' AFTER 'confirmed';

-- Add pickup_time column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_time TEXT DEFAULT NULL;

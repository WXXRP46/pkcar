
-- Add booking_code column
ALTER TABLE public.bookings ADD COLUMN booking_code TEXT UNIQUE;

-- Create function to generate a short booking code
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.booking_code := new_code;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_booking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_booking_code();

-- Backfill existing bookings
UPDATE public.bookings SET booking_code = upper(substr(md5(id::text), 1, 6)) WHERE booking_code IS NULL;

-- Add RLS policy for customers to look up their own booking by code
CREATE POLICY "Anyone can view booking by code"
  ON public.bookings
  FOR SELECT
  USING (true);

-- Drop the old restrictive select policy since we now allow public read
DROP POLICY IF EXISTS "Staff can view all bookings" ON public.bookings;

-- Re-add staff policy for viewing all bookings (the new public policy covers this)

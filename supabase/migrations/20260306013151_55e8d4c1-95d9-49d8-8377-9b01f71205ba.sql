
-- Add payment_method to bookings
ALTER TABLE public.bookings ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Create driver_ratings table
CREATE TABLE public.driver_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL,
  comment text,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

-- Validation trigger for rating range
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rating_trigger
BEFORE INSERT OR UPDATE ON public.driver_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

CREATE POLICY "Anyone can insert ratings" ON public.driver_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view ratings" ON public.driver_ratings FOR SELECT USING (true);
CREATE POLICY "Staff can update ratings" ON public.driver_ratings FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete ratings" ON public.driver_ratings FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- Site settings table for QR image etc
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Staff can insert settings" ON public.site_settings FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update settings" ON public.site_settings FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete settings" ON public.site_settings FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- Insert default QR setting
INSERT INTO public.site_settings (key, value) VALUES ('payment_qr_url', null);

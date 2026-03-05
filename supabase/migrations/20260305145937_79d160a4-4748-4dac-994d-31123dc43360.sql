
-- Add booking_type and dropoff_location to bookings
ALTER TABLE public.bookings ADD COLUMN booking_type TEXT NOT NULL DEFAULT 'daily_rental';
ALTER TABLE public.bookings ADD COLUMN dropoff_location TEXT;

-- Create attractions table
CREATE TABLE public.attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  image_url TEXT,
  location TEXT,
  category TEXT DEFAULT 'attraction',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active attractions" ON public.attractions FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all attractions" ON public.attractions FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert attractions" ON public.attractions FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update attractions" ON public.attractions FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete attractions" ON public.attractions FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  image_url TEXT,
  location TEXT,
  event_date DATE,
  event_end_date DATE,
  event_time TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can view all events" ON public.events FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert events" ON public.events FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update events" ON public.events FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete events" ON public.events FOR DELETE USING (is_staff_or_admin(auth.uid()));

-- Create update triggers
CREATE TRIGGER update_attractions_updated_at BEFORE UPDATE ON public.attractions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

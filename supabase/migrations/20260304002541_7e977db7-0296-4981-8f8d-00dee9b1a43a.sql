
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  van_id UUID REFERENCES public.vans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  photo_url TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Staff can insert drivers" ON public.drivers FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update drivers" ON public.drivers FOR UPDATE USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete drivers" ON public.drivers FOR DELETE USING (is_staff_or_admin(auth.uid()));

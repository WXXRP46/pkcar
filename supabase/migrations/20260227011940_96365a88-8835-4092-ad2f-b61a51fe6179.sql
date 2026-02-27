
-- Create van_images table for multiple images per van
CREATE TABLE public.van_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  van_id UUID NOT NULL REFERENCES public.vans(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.van_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images of available vans
CREATE POLICY "Anyone can view van images" ON public.van_images
  FOR SELECT USING (true);

-- Staff can manage van images
CREATE POLICY "Staff can insert van images" ON public.van_images
  FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update van images" ON public.van_images
  FOR UPDATE USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete van images" ON public.van_images
  FOR DELETE USING (is_staff_or_admin(auth.uid()));

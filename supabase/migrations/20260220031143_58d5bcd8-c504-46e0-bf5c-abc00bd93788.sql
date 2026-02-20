
-- Create role enum for profiles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create van status enum
CREATE TYPE public.van_status AS ENUM ('available', 'maintenance', 'hidden');

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vans table
CREATE TABLE public.vans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 8,
  price_per_day NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  description TEXT,
  features JSONB DEFAULT '{"wifi": false, "ac": true, "vip_seats": false}'::jsonb,
  status van_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  van_id UUID NOT NULL REFERENCES public.vans(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'staff')
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

-- Vans RLS policies - public can read available vans
CREATE POLICY "Anyone can view available vans"
  ON public.vans FOR SELECT
  USING (status = 'available');

CREATE POLICY "Staff can view all vans"
  ON public.vans FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can insert vans"
  ON public.vans FOR INSERT
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update vans"
  ON public.vans FOR UPDATE
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete vans"
  ON public.vans FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Bookings RLS policies
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_staff_or_admin(auth.uid()));

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vans_updated_at
  BEFORE UPDATE ON public.vans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 'staff');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vans;

-- Storage bucket for van images
INSERT INTO storage.buckets (id, name, public)
VALUES ('van-images', 'van-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view van images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'van-images');

CREATE POLICY "Staff can upload van images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'van-images' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update van images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'van-images' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete van images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'van-images' AND public.is_staff_or_admin(auth.uid()));

-- Insert sample vans data
INSERT INTO public.vans (name, model, seats, price_per_day, image_url, description, features, status) VALUES
(
  'Executive Elite',
  'Mercedes-Benz V-Class 2024',
  7,
  4500,
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  'Experience the pinnacle of luxury travel with our flagship Mercedes-Benz V-Class. Perfect for executive meetings, airport transfers, and premium corporate events.',
  '{"wifi": true, "ac": true, "vip_seats": true}'::jsonb,
  'available'
),
(
  'VIP Royale',
  'Toyota Alphard Executive Lounge 2024',
  6,
  3800,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'The Toyota Alphard Executive Lounge offers unmatched comfort with reclining captain seats, premium audio system, and ambient lighting for a first-class cabin feel.',
  '{"wifi": true, "ac": true, "vip_seats": true}'::jsonb,
  'available'
),
(
  'Business Class',
  'Ford Transit Luxury 2023',
  12,
  2800,
  'https://images.unsplash.com/photo-1614791937614-73ea98b0ed59?w=800&q=80',
  'Ideal for group corporate transfers and team outings. Spacious interior with professional leather seating and integrated entertainment system.',
  '{"wifi": true, "ac": true, "vip_seats": false}'::jsonb,
  'available'
),
(
  'City Cruiser',
  'Hyundai H-1 Premium 2023',
  9,
  1800,
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  'Perfect for city tours, family outings, and small group transfers. Comfortable, reliable, and equipped with modern amenities.',
  '{"wifi": false, "ac": true, "vip_seats": false}'::jsonb,
  'available'
);

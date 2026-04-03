CREATE POLICY "Staff can delete bookings"
ON public.bookings
FOR DELETE
USING (is_staff_or_admin(auth.uid()));
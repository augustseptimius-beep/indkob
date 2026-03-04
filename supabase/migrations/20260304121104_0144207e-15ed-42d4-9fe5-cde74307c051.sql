
-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete reservations
CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete wishlist items
CREATE POLICY "Admins can delete wishlist"
ON public.wishlist
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

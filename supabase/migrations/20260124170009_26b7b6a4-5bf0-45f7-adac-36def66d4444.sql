-- Add RLS policies for admin access to profiles table
-- This allows administrators to view and manage user profiles for customer support and account management

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update profiles (for customer support purposes)
CREATE POLICY "Admins can update profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));
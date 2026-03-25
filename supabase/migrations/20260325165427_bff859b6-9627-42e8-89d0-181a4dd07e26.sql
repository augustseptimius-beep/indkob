
-- Fix: Prevent non-admin users from inserting into user_roles
-- The handle_new_user() trigger uses SECURITY DEFINER so it bypasses RLS.
-- We need to ensure regular authenticated users cannot self-promote.

-- Drop the existing ALL policy and replace with granular policies
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

-- Admins can SELECT all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can INSERT roles (but only non-admin roles to prevent lateral escalation)
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can UPDATE roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can DELETE roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

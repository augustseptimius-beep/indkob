-- Add RESTRICTIVE policies to user_roles to provide defense-in-depth against
-- privilege escalation. RESTRICTIVE policies are AND'd with PERMISSIVE ones,
-- guaranteeing that only admins can ever insert/update/delete role rows,
-- even if a future permissive policy is accidentally added.

CREATE POLICY "Restrict user_roles inserts to admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Restrict user_roles updates to admins"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Restrict user_roles deletes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
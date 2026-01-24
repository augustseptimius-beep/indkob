-- Fix has_role function to prevent information disclosure
-- Keep SECURITY DEFINER to avoid RLS recursion, but add access control
-- Users can only check their own roles, not other users' roles

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow checking the calling user's own roles
  -- Returns FALSE for unauthenticated users or when checking others' roles
  -- This prevents information disclosure (user enumeration, admin mapping)
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;
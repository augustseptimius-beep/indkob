
-- Remove email from profiles table and update trigger
-- Step 1: Update handle_new_user to not store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- Step 2: Clear existing emails and drop the column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

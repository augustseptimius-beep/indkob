
-- Add first_name and last_name columns
ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;

-- Migrate existing full_name data: split on first space
UPDATE public.profiles SET
  first_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
      THEN left(full_name, position(' ' in full_name) - 1)
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0 
      THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END;

-- Drop the old full_name column and recreate as generated
ALTER TABLE public.profiles DROP COLUMN full_name;
ALTER TABLE public.profiles ADD COLUMN full_name text GENERATED ALWAYS AS (
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE NULL
  END
) STORED;

-- Update the handle_new_user trigger to use first_name/last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

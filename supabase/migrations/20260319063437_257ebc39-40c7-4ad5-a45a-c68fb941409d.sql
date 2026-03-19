
-- Recreate the trigger on auth.users to auto-create profiles for new signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profiles for any auth users who are missing one
INSERT INTO public.profiles (user_id, email, first_name, last_name, phone)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Also backfill member roles for users missing them
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'member'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.id IS NULL;

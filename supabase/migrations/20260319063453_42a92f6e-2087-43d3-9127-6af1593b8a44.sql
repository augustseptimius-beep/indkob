
-- Fix Helle's profile: set first_name based on email since metadata was empty
UPDATE public.profiles 
SET first_name = 'Helle', last_name = 'Haugaard'
WHERE user_id = '2abd16af-0343-4902-8b77-6058d92b422c' AND full_name IS NULL;

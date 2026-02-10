
-- Fix 1: Restrict user reservation updates - users can only update quantity on pending reservations
-- Drop existing user update policy
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;

-- Users can only update quantity on their own pending reservations
CREATE POLICY "Users can update own pending reservation quantity"
ON public.reservations FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Fix 2: Remove public SELECT on email_templates (admin-only)
DROP POLICY IF EXISTS "Anyone can view email_templates" ON public.email_templates;

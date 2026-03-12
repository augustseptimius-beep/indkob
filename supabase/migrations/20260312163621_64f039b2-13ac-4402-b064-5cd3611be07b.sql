
-- Tighten payments INSERT policy: only authenticated users can insert their own payments
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Tighten email_logs INSERT policy: restrict to authenticated users (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can insert email_logs" ON public.email_logs;
CREATE POLICY "System can insert email_logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

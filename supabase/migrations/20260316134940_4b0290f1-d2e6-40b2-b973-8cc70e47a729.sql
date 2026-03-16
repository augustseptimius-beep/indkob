CREATE TABLE public.membership_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_text text NOT NULL,
  consent_version integer NOT NULL DEFAULT 1,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own consent"
  ON public.membership_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own consent"
  ON public.membership_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consents"
  ON public.membership_consents
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
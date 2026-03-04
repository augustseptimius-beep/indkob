
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  template_key text,
  notification_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  product_id uuid,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email_logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert email_logs" ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX idx_email_logs_notification_type ON public.email_logs (notification_type);
CREATE INDEX idx_email_logs_recipient_email ON public.email_logs (recipient_email);

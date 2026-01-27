-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage email_templates" 
ON public.email_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view templates (needed for edge function)
CREATE POLICY "Anyone can view email_templates" 
ON public.email_templates 
FOR SELECT 
USING (true);

-- Insert default templates
INSERT INTO public.email_templates (key, name, subject, body_html, description, trigger_type) VALUES
(
  'product_ordered',
  'Produkt bestilt',
  '🛒 {{product_title}} er nu bestilt!',
  '<p>Hej {{user_name}},</p>
<p>Vi vil gerne informere dig om, at <strong>{{product_title}}</strong> er nu bestilt hos leverandøren.</p>

<div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Din reservation:</h3>
  <p><strong>Produkt:</strong> {{product_title}}</p>
  <p><strong>Antal:</strong> {{quantity}} {{unit_name}}</p>
  <p><strong>Pris pr. enhed:</strong> {{price_per_unit}} kr.</p>
  <p><strong>Total:</strong> {{total_price}} kr.</p>
</div>

<p>Du vil modtage en ny besked, når varen er ankommet og klar til afhentning.</p>',
  'Sendes automatisk når et produkt ændres til status "Bestilt"',
  'product_status_ordered'
),
(
  'product_arrived',
  'Produkt ankommet',
  '📦 {{product_title}} er kommet hjem!',
  '<p>Hej {{user_name}},</p>
<p>Vi vil gerne informere dig om, at <strong>{{product_title}}</strong> er ankommet og klar til afhentning.</p>

<div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Din reservation:</h3>
  <p><strong>Produkt:</strong> {{product_title}}</p>
  <p><strong>Antal:</strong> {{quantity}} {{unit_name}}</p>
  <p><strong>Pris pr. enhed:</strong> {{price_per_unit}} kr.</p>
  <p><strong>Total:</strong> {{total_price}} kr.</p>
</div>

<p style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 20px;">
  <strong>💳 Betaling:</strong> Betal venligst via MobilePay til {{mobilepay_number}}. 
  Husk at skrive dit navn i beskeden.
</p>',
  'Sendes automatisk når et produkt ændres til status "Ankommet"',
  'product_status_arrived'
),
(
  'payment_confirmed',
  'Betaling bekræftet',
  '✅ Betaling modtaget for {{product_title}}',
  '<p>Hej {{user_name}},</p>
<p>Vi har modtaget din betaling for <strong>{{product_title}}</strong>.</p>

<div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; color: #065f46;">Betalingsbekræftelse</h3>
  <p><strong>Produkt:</strong> {{product_title}}</p>
  <p><strong>Betalt beløb:</strong> {{total_price}} kr.</p>
  <p><strong>Betalt den:</strong> {{paid_at}}</p>
</div>

<p>Tak for dit køb! Du kan nu hente dine varer.</p>',
  'Sendes automatisk når en reservation markeres som betalt',
  'payment_confirmed'
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
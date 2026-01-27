-- Insert new email templates
INSERT INTO public.email_templates (key, name, subject, body_html, description, trigger_type, is_active) VALUES
(
  'welcome',
  'Velkomstmail',
  'Velkommen til Klitmøllers Indkøbsforening! 🌿',
  '<p>Hej {{user_name}},</p>
<p>Velkommen til Klitmøllers Indkøbsforening! Vi er glade for at have dig med i fællesskabet.</p>
<p>Som medlem kan du nu:</p>
<ul>
  <li>Reservere økologiske produkter til gode priser</li>
  <li>Deltage i fællesindkøb og spare penge</li>
  <li>Ønske nye produkter til sortimentet</li>
</ul>
<p>Besøg vores hjemmeside for at se de aktuelle produkter og kom i gang med at spare.</p>',
  'Sendes automatisk når en ny bruger opretter en profil',
  'automatic',
  true
),
(
  'reservation_confirmed',
  'Reservationsbekræftelse',
  'Din reservation er bekræftet ✓',
  '<p>Hej {{user_name}},</p>
<p>Din reservation er nu registreret.</p>
<div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Reservationsdetaljer:</h3>
  <p><strong>Produkt:</strong> {{product_title}}</p>
  <p><strong>Antal:</strong> {{quantity}} {{unit_name}}</p>
  <p><strong>Pris pr. enhed:</strong> {{price_per_unit}} kr.</p>
  <p><strong>Total:</strong> {{total_price}} kr.</p>
</div>
<p>Vi giver dig besked når produktet er bestilt hjem og når det er klar til afhentning.</p>',
  'Sendes automatisk når en bruger opretter eller ændrer en reservation',
  'automatic',
  true
),
(
  'reservation_cancelled',
  'Annuleringsbekræftelse',
  'Din reservation er annulleret',
  '<p>Hej {{user_name}},</p>
<p>Vi bekræfter hermed at din reservation er blevet annulleret.</p>
<div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Produkt:</strong> {{product_title}}</p>
  <p><strong>Antal:</strong> {{quantity}} {{unit_name}}</p>
</div>
<p>Du er altid velkommen til at reservere igen.</p>',
  'Sendes automatisk når en bruger annullerer en reservation',
  'automatic',
  true
),
(
  'new_product',
  'Nyt produkt i sortimentet',
  'Nyt produkt: {{product_title}} 🆕',
  '<p>Hej {{user_name}},</p>
<p>Vi har tilføjet et nyt produkt til sortimentet!</p>
<div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">{{product_title}}</h3>
  <p>{{product_description}}</p>
  <p><strong>Pris:</strong> {{price_per_unit}} kr. pr. {{unit_name}}</p>
  <p><strong>Målmængde:</strong> {{target_quantity}} {{unit_name}}</p>
</div>
<p>Skynd dig ind og reserver din del!</p>',
  'Sendes til alle medlemmer når et nyt produkt tilføjes',
  'automatic',
  true
),
(
  'product_target_reached',
  'Produkt klar til bestilling (Admin)',
  '🎯 {{product_title}} har nået målmængden!',
  '<p>Hej Admin,</p>
<p><strong>{{product_title}}</strong> har nu nået målmængden og er klar til at blive bestilt hjem.</p>
<div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Produktdetaljer:</h3>
  <p><strong>Aktuel mængde:</strong> {{current_quantity}} {{unit_name}}</p>
  <p><strong>Målmængde:</strong> {{target_quantity}} {{unit_name}}</p>
  <p><strong>Antal reservationer:</strong> {{reservation_count}}</p>
</div>
<p>Gå til admin-panelet for at markere produktet som bestilt.</p>',
  'Sendes til admin når et produkt når sin målmængde',
  'automatic',
  true
);

-- Create trigger function for welcome email on profile creation
CREATE OR REPLACE FUNCTION public.notify_on_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Get signing key from vault
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  IF signing_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured';
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'type', 'welcome',
    'userId', NEW.user_id
  );
  
  signature := encode(extensions.hmac(body::text, signing_key, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Signature', signature
    ),
    body := body
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for profile creation
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_profile_created();

-- Create trigger function for reservation changes
CREATE OR REPLACE FUNCTION public.notify_on_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
  notification_type text;
  product_record record;
BEGIN
  -- Determine notification type
  IF TG_OP = 'INSERT' THEN
    notification_type := 'reservation_confirmed';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify on quantity changes
    IF OLD.quantity = NEW.quantity THEN
      RETURN NEW;
    END IF;
    notification_type := 'reservation_confirmed';
  ELSIF TG_OP = 'DELETE' THEN
    notification_type := 'reservation_cancelled';
  END IF;

  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Get signing key from vault
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  IF signing_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build the body based on operation
  IF TG_OP = 'DELETE' THEN
    body := jsonb_build_object(
      'type', notification_type,
      'reservationId', OLD.id,
      'userId', OLD.user_id,
      'productId', OLD.product_id,
      'quantity', OLD.quantity
    );
  ELSE
    body := jsonb_build_object(
      'type', notification_type,
      'reservationId', NEW.id,
      'userId', NEW.user_id,
      'productId', NEW.product_id,
      'quantity', NEW.quantity
    );
  END IF;
  
  signature := encode(extensions.hmac(body::text, signing_key, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Signature', signature
    ),
    body := body
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for reservation changes
DROP TRIGGER IF EXISTS on_reservation_created ON public.reservations;
DROP TRIGGER IF EXISTS on_reservation_updated ON public.reservations;
DROP TRIGGER IF EXISTS on_reservation_deleted ON public.reservations;

CREATE TRIGGER on_reservation_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reservation_change();

CREATE TRIGGER on_reservation_updated
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reservation_change();

CREATE TRIGGER on_reservation_deleted
  AFTER DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reservation_change();

-- Create trigger function for new products
CREATE OR REPLACE FUNCTION public.notify_on_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Get signing key from vault
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  IF signing_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured';
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'type', 'new_product',
    'productId', NEW.id
  );
  
  signature := encode(extensions.hmac(body::text, signing_key, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Signature', signature
    ),
    body := body
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for new products
DROP TRIGGER IF EXISTS on_product_created ON public.products;
CREATE TRIGGER on_product_created
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_product();

-- Create trigger function for product target reached (admin notification)
CREATE OR REPLACE FUNCTION public.notify_on_product_target_reached()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  -- Only trigger when current_quantity changes and reaches or exceeds target
  IF OLD.current_quantity >= OLD.target_quantity THEN
    -- Already at or above target, no notification
    RETURN NEW;
  END IF;
  
  IF NEW.current_quantity < NEW.target_quantity THEN
    -- Not yet at target
    RETURN NEW;
  END IF;

  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Get signing key from vault
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  IF signing_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured';
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'type', 'product_target_reached',
    'productId', NEW.id
  );
  
  signature := encode(extensions.hmac(body::text, signing_key, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Signature', signature
    ),
    body := body
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for product target reached
DROP TRIGGER IF EXISTS on_product_target_reached ON public.products;
CREATE TRIGGER on_product_target_reached
  AFTER UPDATE ON public.products
  FOR EACH ROW
  WHEN (OLD.current_quantity IS DISTINCT FROM NEW.current_quantity)
  EXECUTE FUNCTION public.notify_on_product_target_reached();
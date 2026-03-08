
ALTER TABLE public.products ADD COLUMN notify_threshold integer NOT NULL DEFAULT 2;

CREATE OR REPLACE FUNCTION public.notify_on_product_almost_reached()
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
  old_remaining integer;
  new_remaining integer;
  threshold integer;
BEGIN
  IF OLD.current_quantity = NEW.current_quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.status != 'open' OR NEW.current_quantity >= NEW.target_quantity THEN
    RETURN NEW;
  END IF;

  threshold := NEW.notify_threshold * NEW.minimum_purchase;
  old_remaining := OLD.target_quantity - OLD.current_quantity;
  new_remaining := NEW.target_quantity - NEW.current_quantity;

  IF NOT (old_remaining > threshold AND new_remaining <= threshold) THEN
    RETURN NEW;
  END IF;

  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  IF signing_key IS NULL THEN
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'type', 'product_almost_reached',
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

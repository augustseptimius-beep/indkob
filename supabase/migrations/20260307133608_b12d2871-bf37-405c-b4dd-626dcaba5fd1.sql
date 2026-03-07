
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
  -- Only trigger when current_quantity changes
  IF OLD.current_quantity = NEW.current_quantity THEN
    RETURN NEW;
  END IF;

  -- Only for open products that haven't reached target yet
  IF NEW.status != 'open' OR NEW.current_quantity >= NEW.target_quantity THEN
    RETURN NEW;
  END IF;

  -- Calculate threshold: 2 reservations worth = 2 * minimum_purchase
  threshold := 2 * NEW.minimum_purchase;
  old_remaining := OLD.target_quantity - OLD.current_quantity;
  new_remaining := NEW.target_quantity - NEW.current_quantity;

  -- Only trigger when we cross the threshold (was above, now at or below)
  IF old_remaining > threshold OR new_remaining > threshold THEN
    RETURN NEW;
  END IF;

  -- Additional guard: old_remaining must have been above threshold
  IF NOT (old_remaining > threshold AND new_remaining <= threshold) THEN
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

-- Create trigger on products table
CREATE TRIGGER on_product_almost_reached
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_product_almost_reached();

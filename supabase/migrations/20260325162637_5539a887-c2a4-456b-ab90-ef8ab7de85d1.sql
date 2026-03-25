CREATE OR REPLACE FUNCTION public.notify_on_product_status_change()
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
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status != 'ordered' OR OLD.status != 'open' THEN
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
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured';
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'productId', NEW.id,
    'notificationType', 'ordered'
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
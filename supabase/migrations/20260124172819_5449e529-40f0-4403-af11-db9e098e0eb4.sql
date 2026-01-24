-- Update the notify_on_product_status_change function to use HMAC signature
CREATE OR REPLACE FUNCTION public.notify_on_product_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_type text;
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification type based on new status
  IF NEW.status = 'ordered' AND OLD.status = 'open' THEN
    notification_type := 'ordered';
  ELSIF NEW.status = 'arrived' AND OLD.status = 'ordered' THEN
    notification_type := 'arrived';
  ELSE
    -- No notification for other status changes
    RETURN NEW;
  END IF;

  -- Get the Supabase URL from runtime config
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Get signing key from vault for HMAC authentication
  BEGIN
    SELECT decrypted_secret INTO signing_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'edge_function_signing_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    signing_key := NULL;
  END;
  
  -- Only proceed if we have the signing key configured
  IF signing_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: edge_function_signing_key not configured in vault';
    RETURN NEW;
  END IF;

  -- Build request body
  body := jsonb_build_object(
    'productId', NEW.id,
    'notificationType', notification_type
  );
  
  -- Generate HMAC-SHA256 signature
  signature := encode(hmac(body::text, signing_key, 'sha256'), 'hex');

  -- Make HTTP request to edge function with signature header
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
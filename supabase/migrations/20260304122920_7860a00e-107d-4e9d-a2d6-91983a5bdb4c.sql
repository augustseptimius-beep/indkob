
-- Create trigger function to notify on payment confirmation
CREATE OR REPLACE FUNCTION public.notify_on_payment_confirmed()
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
  -- Only trigger when paid changes from false to true
  IF OLD.paid = true OR NEW.paid = false THEN
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
    'type', 'payment_confirmed',
    'reservationId', NEW.id,
    'userId', NEW.user_id,
    'productId', NEW.product_id,
    'quantity', NEW.quantity
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

-- Create the trigger
CREATE TRIGGER on_payment_confirmed
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_payment_confirmed();

ALTER TABLE public.reservations ADD COLUMN batch_id uuid;

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
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.batch_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    notification_type := 'reservation_confirmed';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.quantity = NEW.quantity THEN
      RETURN NEW;
    END IF;
    notification_type := 'reservation_confirmed';
  ELSIF TG_OP = 'DELETE' THEN
    notification_type := 'reservation_cancelled';
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
    RETURN COALESCE(NEW, OLD);
  END IF;

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

CREATE OR REPLACE FUNCTION public.reset_product_quantity_on_order()
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
  affected_ids uuid[];
BEGIN
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    -- Collect IDs of pending reservations BEFORE updating them
    SELECT array_agg(id) INTO affected_ids
    FROM reservations
    WHERE product_id = NEW.id AND status = 'pending';

    -- Mark all pending reservations for this product as ordered
    UPDATE reservations 
    SET status = 'ordered', updated_at = now()
    WHERE product_id = NEW.id AND status = 'pending';
    
    -- Send notification with the specific reservation IDs that were just updated
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
    
    IF signing_key IS NOT NULL AND affected_ids IS NOT NULL THEN
      body := jsonb_build_object(
        'productId', NEW.id,
        'notificationType', 'ordered',
        'reservationIds', to_jsonb(affected_ids)
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
    END IF;
    
    -- Reset quantity and set back to open
    NEW.current_quantity := 0;
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$function$;

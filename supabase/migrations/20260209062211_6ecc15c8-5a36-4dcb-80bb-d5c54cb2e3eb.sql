-- Update the notification trigger to fire BEFORE the reset trigger changes status back.
-- Since both are BEFORE triggers, we need to use a different approach:
-- The notification for "ordered" should now be sent from the reset trigger itself.

CREATE OR REPLACE FUNCTION public.reset_product_quantity_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    -- Marker alle pending reservationer for dette produkt som ordered
    UPDATE reservations 
    SET status = 'ordered', updated_at = now()
    WHERE product_id = NEW.id AND status = 'pending';
    
    -- Send notification before resetting status
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
    
    IF signing_key IS NOT NULL THEN
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
    END IF;
    
    -- Nulstil quantity og sæt tilbage til open
    NEW.current_quantity := 0;
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$;

-- Remove the old status change notification trigger since the reset trigger now handles 'ordered' notifications
-- Keep the trigger function for 'arrived' notifications (which still works via reservation batch updates)
-- Actually, 'arrived' status is no longer used on products either (it's on reservations now as 'ready')
-- So we can drop the product status change trigger entirely
DROP TRIGGER IF EXISTS trigger_notify_product_status_change ON products;
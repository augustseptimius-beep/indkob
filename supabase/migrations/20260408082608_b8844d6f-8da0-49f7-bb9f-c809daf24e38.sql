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
  IF NEW.status = 'ordered' AND OLD.status IS DISTINCT FROM 'ordered' THEN
    SELECT array_agg(id) INTO affected_ids
    FROM public.reservations
    WHERE product_id = NEW.id AND status = 'pending';

    UPDATE public.reservations
    SET status = 'ordered', updated_at = now()
    WHERE product_id = NEW.id AND status = 'pending';

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

    NEW.current_quantity := 0;
    NEW.status := 'open';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reset_quantity_on_order ON public.products;
DROP TRIGGER IF EXISTS on_product_status_change ON public.products;

CREATE TRIGGER on_product_status_change
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.reset_product_quantity_on_order();
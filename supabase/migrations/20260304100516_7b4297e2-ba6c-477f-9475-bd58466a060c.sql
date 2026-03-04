CREATE OR REPLACE FUNCTION public.update_product_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products 
    SET current_quantity = current_quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products 
    SET current_quantity = current_quantity - OLD.quantity,
        updated_at = now()
    WHERE id = OLD.product_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- No-op when quantity and product are unchanged (e.g. only status/paid fields changed)
    IF NEW.product_id = OLD.product_id AND NEW.quantity = OLD.quantity THEN
      RETURN NEW;
    END IF;

    -- Handle product move between products
    IF NEW.product_id <> OLD.product_id THEN
      UPDATE public.products
      SET current_quantity = current_quantity - OLD.quantity,
          updated_at = now()
      WHERE id = OLD.product_id;

      UPDATE public.products
      SET current_quantity = current_quantity + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    ELSE
      -- Same product, quantity changed
      UPDATE public.products
      SET current_quantity = current_quantity - OLD.quantity + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
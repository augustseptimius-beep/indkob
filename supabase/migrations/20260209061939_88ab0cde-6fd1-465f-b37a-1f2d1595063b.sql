-- Opdater trigger: når status sættes til 'ordered',
-- marker alle pending reservationer som 'ordered',
-- nulstil quantity, og sæt status tilbage til 'open'
CREATE OR REPLACE FUNCTION public.reset_product_quantity_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    -- Marker alle pending reservationer for dette produkt som ordered
    UPDATE reservations 
    SET status = 'ordered', updated_at = now()
    WHERE product_id = NEW.id AND status = 'pending';
    
    -- Nulstil quantity og sæt tilbage til open
    NEW.current_quantity := 0;
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$;

-- Sørg for at triggeren er korrekt sat op (BEFORE UPDATE, ikke AFTER)
DROP TRIGGER IF EXISTS reset_quantity_on_order ON products;
CREATE TRIGGER reset_quantity_on_order
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION reset_product_quantity_on_order();
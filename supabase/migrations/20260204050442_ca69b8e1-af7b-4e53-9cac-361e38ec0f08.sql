-- Create function to reset product quantity when status changes to 'ordered'
CREATE OR REPLACE FUNCTION public.reset_product_quantity_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only reset when status changes TO 'ordered' (not from)
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    NEW.current_quantity := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger that fires BEFORE update so we can modify the row
CREATE TRIGGER reset_quantity_on_order
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_product_quantity_on_order();
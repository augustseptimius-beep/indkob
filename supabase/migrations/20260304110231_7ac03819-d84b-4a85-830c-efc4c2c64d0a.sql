
-- Drop all triggers first, then recreate
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_reservation_change ON public.reservations;
DROP TRIGGER IF EXISTS on_new_product ON public.products;
DROP TRIGGER IF EXISTS on_product_target_reached ON public.products;
DROP TRIGGER IF EXISTS on_product_status_change ON public.products;
DROP TRIGGER IF EXISTS on_reservation_quantity_sync ON public.reservations;
DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;

-- 1. Profile created -> welcome email
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_profile_created();

-- 2. Reservation changes -> confirmation/cancellation emails
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reservation_change();

-- 3. New product -> notify all members
CREATE TRIGGER on_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_product();

-- 4. Product target reached -> notify admins
CREATE TRIGGER on_product_target_reached
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_product_target_reached();

-- 5. Product order trigger (resets quantity, sends notification, reopens product)
CREATE TRIGGER on_product_status_change
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_product_quantity_on_order();

-- 6. Reservation quantity sync -> update product current_quantity
CREATE TRIGGER on_reservation_quantity_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_quantity();

-- 7. Updated_at auto-update for products
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

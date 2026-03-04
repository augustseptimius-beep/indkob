-- Clean up duplicate triggers

-- 1. Products: remove duplicate new product trigger
DROP TRIGGER IF EXISTS on_product_created ON public.products;
-- Keep: on_new_product

-- 2. Products: remove duplicate reset_quantity_on_order trigger  
DROP TRIGGER IF EXISTS reset_quantity_on_order ON public.products;
-- Keep: on_product_status_change

-- 3. Products: add missing trigger for arrived notifications
DROP TRIGGER IF EXISTS on_product_status_notification ON public.products;
CREATE TRIGGER on_product_status_notification
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_product_status_change();

-- 4. Reservations: remove duplicate notification triggers (keep only the combined one)
DROP TRIGGER IF EXISTS on_reservation_created ON public.reservations;
DROP TRIGGER IF EXISTS on_reservation_deleted ON public.reservations;
DROP TRIGGER IF EXISTS on_reservation_updated ON public.reservations;
-- Keep: on_reservation_notification (handles INSERT/UPDATE/DELETE)

-- 5. Reservations: remove duplicate quantity sync trigger
DROP TRIGGER IF EXISTS on_reservation_quantity_sync ON public.reservations;
-- Keep: on_reservation_change (handles INSERT/UPDATE/DELETE)
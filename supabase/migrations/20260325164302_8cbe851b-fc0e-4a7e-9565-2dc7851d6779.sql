DROP TRIGGER IF EXISTS on_product_status_change ON public.products;
DROP TRIGGER IF EXISTS on_product_status_notification ON public.products;
DROP FUNCTION IF EXISTS public.notify_on_product_status_change() CASCADE;
-- Recreate the payment confirmation trigger
DROP TRIGGER IF EXISTS on_payment_confirmed ON public.reservations;

CREATE TRIGGER on_payment_confirmed
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_payment_confirmed();

-- Also ensure other reservation triggers exist
DROP TRIGGER IF EXISTS on_reservation_change ON public.reservations;
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_quantity();

DROP TRIGGER IF EXISTS on_reservation_notification ON public.reservations;
CREATE TRIGGER on_reservation_notification
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reservation_change();
-- Ensure update_product_quantity trigger fires on INSERT, UPDATE, and DELETE
-- Currently it only fires on INSERT which means edits and cancellations don't update the product quantity
DROP TRIGGER IF EXISTS on_reservation_change ON reservations;
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity();
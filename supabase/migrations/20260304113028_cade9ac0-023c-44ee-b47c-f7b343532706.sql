
-- Temporarily set status to a temp value, then to 'ordered' to trigger the notification
-- The trigger reset_product_quantity_on_order will:
-- 1. Send the notification email to all reservators
-- 2. Reset current_quantity to 0 (already 0)
-- 3. Set status back to 'open'
UPDATE public.products 
SET status = 'ordered' 
WHERE id = '7ba9bc5d-aadb-4564-9148-ab31bbf3753a';

-- Add comparison_price column for showing savings compared to retail prices
ALTER TABLE public.products 
ADD COLUMN comparison_price numeric NULL;

COMMENT ON COLUMN public.products.comparison_price IS 'Normal retail price for comparison (e.g., Rema1000 price per unit)';
-- Add is_organic field to products table
ALTER TABLE public.products 
ADD COLUMN is_organic BOOLEAN NOT NULL DEFAULT false;
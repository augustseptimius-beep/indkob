-- Add paid column to reservations table for tracking payment status
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

-- Add paid_at timestamp to track when payment was marked
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Create index for faster queries on paid status
CREATE INDEX IF NOT EXISTS idx_reservations_paid ON public.reservations(paid);

-- Comment for clarity
COMMENT ON COLUMN public.reservations.paid IS 'Whether the user has paid for this reservation (marked by admin)';
COMMENT ON COLUMN public.reservations.paid_at IS 'Timestamp when admin marked the reservation as paid';
-- Mark old round-1 egg reservations as completed (already paid and picked up)
UPDATE reservations 
SET status = 'completed', updated_at = now()
WHERE id IN (
  '2b51c7f8-34c5-4261-92fb-ffd2d3439f85',
  'f2ec86d0-2a03-4d1e-b8d3-4917b2610206',
  'ff7c7a93-cdf6-4b6f-9cce-977fda537a3f',
  '0cc50cd1-773f-4dcd-87de-c88796188cb8'
);
-- Create a secure function to insert/update a secret in the vault
-- This function can only be called by service role (not by regular users)
CREATE OR REPLACE FUNCTION public.upsert_vault_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Check if secret already exists
  SELECT id INTO existing_id
  FROM vault.secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Update existing secret
    UPDATE vault.secrets
    SET secret = secret_value,
        updated_at = now()
    WHERE id = existing_id;
  ELSE
    -- Insert new secret
    INSERT INTO vault.secrets (name, secret)
    VALUES (secret_name, secret_value);
  END IF;
END;
$$;

-- Revoke all permissions from public and anon
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM authenticated;

-- Only service_role can execute this function
GRANT EXECUTE ON FUNCTION public.upsert_vault_secret(text, text) TO service_role;
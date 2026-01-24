-- Drop the old function
DROP FUNCTION IF EXISTS public.upsert_vault_secret(text, text);

-- Create a secure function using Supabase's vault.create_secret API
CREATE OR REPLACE FUNCTION public.upsert_vault_secret(p_secret_name text, p_secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Check if secret already exists in vault
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = p_secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Delete existing secret first (vault doesn't support update)
    DELETE FROM vault.secrets WHERE id = existing_id;
  END IF;

  -- Use vault.create_secret to properly encrypt and store
  PERFORM vault.create_secret(p_secret_value, p_secret_name);
END;
$$;

-- Revoke all permissions from public users
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_vault_secret(text, text) FROM authenticated;

-- Only service_role can execute this function
GRANT EXECUTE ON FUNCTION public.upsert_vault_secret(text, text) TO service_role;
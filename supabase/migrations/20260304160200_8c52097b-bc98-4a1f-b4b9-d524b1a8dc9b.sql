
DO $$
DECLARE
  supabase_url text;
  signing_key text;
  body jsonb;
  signature text;
BEGIN
  supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  
  SELECT decrypted_secret INTO signing_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'edge_function_signing_key' 
  LIMIT 1;

  body := jsonb_build_object(
    'productId', '7ba9bc5d-aadb-4564-9148-ab31bbf3753a',
    'notificationType', 'arrived'
  );
  
  signature := encode(extensions.hmac(body::text, signing_key, 'sha256'), 'hex');

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Signature', signature
    ),
    body := body
  );
  
  RAISE NOTICE 'Arrived notification resent for æg product';
END;
$$;

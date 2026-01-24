-- Add missing RLS policies for wishlist table
-- Users should be able to update and delete their own wishlist items

CREATE POLICY "Users can update own wishlist items" 
  ON public.wishlist 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" 
  ON public.wishlist 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Update the notification trigger function to use vault for anon key
-- This removes the hardcoded key and uses dynamic retrieval

CREATE OR REPLACE FUNCTION public.notify_on_product_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_type text;
  supabase_url text;
  anon_key text;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification type based on new status
  IF NEW.status = 'ordered' AND OLD.status = 'open' THEN
    notification_type := 'ordered';
  ELSIF NEW.status = 'arrived' AND OLD.status = 'ordered' THEN
    notification_type := 'arrived';
  ELSE
    -- No notification for other status changes
    RETURN NEW;
  END IF;

  -- Get the Supabase URL from runtime config
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xekuhgwajypsblglrctp.supabase.co';
  END IF;
  
  -- Try to get anon key from vault first, then fall back to runtime config
  BEGIN
    SELECT decrypted_secret INTO anon_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'supabase_anon_key' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    anon_key := NULL;
  END;
  
  IF anon_key IS NULL THEN
    anon_key := current_setting('app.settings.supabase_anon_key', true);
  END IF;
  
  -- Only proceed if we have the anon key configured
  IF anon_key IS NULL THEN
    RAISE NOTICE 'Skipping notification: anon_key not configured in vault or runtime settings';
    RETURN NEW;
  END IF;

  -- Make HTTP request to edge function using pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'productId', NEW.id,
      'notificationType', notification_type
    )
  );

  RETURN NEW;
END;
$function$;
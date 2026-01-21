-- Create a function that will be called by pg_net to send notifications
-- We'll use pg_net extension to call the edge function from the database trigger

-- Enable the pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the notification edge function
CREATE OR REPLACE FUNCTION public.notify_on_product_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type text;
  supabase_url text;
  service_role_key text;
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

  -- Get the Supabase URL and service role key from vault or use defaults
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  -- Make HTTP request to edge function using pg_net
  PERFORM net.http_post(
    url := 'https://xekuhgwajypsblglrctp.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhla3VoZ3dhanlwc2JsZ2xyY3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDgxNjIsImV4cCI6MjA4NDQyNDE2Mn0.2Y_-saqaR7CLIQZFw1JFy-AM1jAt0jPodROLzPBgtDg'
    ),
    body := jsonb_build_object(
      'productId', NEW.id,
      'notificationType', notification_type
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on products table
DROP TRIGGER IF EXISTS trigger_notify_product_status_change ON public.products;
CREATE TRIGGER trigger_notify_product_status_change
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_product_status_change();
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TODO: When Stripe is activated, replace this with actual signature verification
    // const signature = req.headers.get("stripe-signature");
    // const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const body = await req.text();
    const event = JSON.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        const reservationId = session?.metadata?.reservation_id;
        const paymentIntentId = session?.payment_intent;

        if (reservationId) {
          // Update payment record
          await supabase
            .from("payments")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("stripe_checkout_session_id", session.id);

          // Mark reservation as paid
          await supabase
            .from("reservations")
            .update({ paid: true, paid_at: new Date().toISOString() })
            .eq("id", reservationId);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data?.object;
        await supabase
          .from("payments")
          .update({ status: "succeeded" })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data?.object;
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

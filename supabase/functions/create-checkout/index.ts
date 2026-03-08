import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { reservation_id } = await req.json();
    if (!reservation_id) {
      return new Response(
        JSON.stringify({ error: "reservation_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch reservation + product using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select("*, products(*)")
      .eq("id", reservation_id)
      .eq("user_id", userId)
      .single();

    if (resError || !reservation) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (reservation.paid) {
      return new Response(
        JSON.stringify({ error: "Reservation already paid" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const product = reservation.products;
    const amount = reservation.quantity * product.price_per_unit;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        reservation_id,
        user_id: userId,
        amount,
        currency: "dkk",
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: "Could not create payment record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // TODO: When Stripe is activated, create a Checkout Session here:
    // const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   line_items: [{ price_data: { currency: "dkk", product_data: { name: product.title }, unit_amount: Math.round(product.price_per_unit * 100) }, quantity: reservation.quantity }],
    //   mode: "payment",
    //   success_url: `${req.headers.get("origin")}/min-side?payment=success`,
    //   cancel_url: `${req.headers.get("origin")}/min-side?payment=cancelled`,
    //   metadata: { reservation_id, payment_id: payment.id },
    // });
    // Update payment with session id:
    // await supabase.from("payments").update({ stripe_checkout_session_id: session.id }).eq("id", payment.id);

    return new Response(
      JSON.stringify({
        message:
          "Stripe is not yet configured. Payment record created with status pending.",
        payment_id: payment.id,
        // url: session.url  // Uncomment when Stripe is active
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

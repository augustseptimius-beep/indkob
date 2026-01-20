import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  productId: string;
  notificationType: "ordered" | "arrived";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { productId, notificationType }: NotificationRequest = await req.json();

    console.log(`Sending ${notificationType} notification for product ${productId}`);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("Product not found:", productError);
      throw new Error("Product not found");
    }

    console.log(`Product found: ${product.title}`);

    // Get all reservations for this product
    const { data: reservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("*")
      .eq("product_id", productId);

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      throw new Error("Could not fetch reservations");
    }

    console.log(`Found ${reservations?.length || 0} reservations`);

    if (!reservations || reservations.length === 0) {
      console.log("No reservations found for this product");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No reservations to notify",
          emailsSent: 0,
          emailsFailed: 0 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get unique user IDs from reservations
    const userIds = [...new Set(reservations.map(r => r.user_id))];
    
    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Could not fetch user profiles");
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Create a map of user_id to profile
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Prepare email content based on notification type
    const subject = notificationType === "ordered"
      ? `🛒 ${product.title} er nu bestilt!`
      : `📦 ${product.title} er kommet hjem!`;

    const statusText = notificationType === "ordered"
      ? "er nu bestilt hos leverandøren"
      : "er ankommet og klar til afhentning";

    const paymentNote = notificationType === "arrived"
      ? `<p style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 20px;">
          <strong>💳 Betaling:</strong> Betal venligst via MobilePay til xxx-xxxxx. 
          Husk at skrive dit navn i beskeden.
        </p>`
      : "";

    // Send emails to all users who reserved
    const emailPromises = reservations
      .filter(r => {
        const profile = profileMap.get(r.user_id);
        return profile?.email;
      })
      .map(async (reservation) => {
        const profile = profileMap.get(reservation.user_id)!;
        const userEmail = profile.email;
        const userName = profile.full_name || "Kære medlem";
        const totalPrice = (reservation.quantity * product.price_per_unit).toFixed(2);

        const html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #5c6b5a;">Klitmøllers Indkøbsforening</h1>
            <h2 style="color: #333;">${subject}</h2>
            <p>Hej ${userName},</p>
            <p>Vi vil gerne informere dig om, at <strong>${product.title}</strong> ${statusText}.</p>
            
            <div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Din reservation:</h3>
              <p><strong>Produkt:</strong> ${product.title}</p>
              <p><strong>Antal:</strong> ${reservation.quantity} ${product.unit_name}</p>
              <p><strong>Pris pr. enhed:</strong> ${product.price_per_unit} kr.</p>
              <p><strong>Total:</strong> ${totalPrice} kr.</p>
            </div>
            
            ${paymentNote}
            
            <p style="margin-top: 30px; color: #666;">
              Med venlig hilsen,<br>
              Klitmøllers Indkøbsforening
            </p>
          </div>
        `;

        console.log(`Sending email to ${userEmail}`);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Klitmøllers Indkøbsforening <onboarding@resend.dev>",
            to: [userEmail],
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          console.error(`Failed to send email to ${userEmail}:`, error);
          throw new Error(`Failed to send email: ${error}`);
        }

        const result = await res.json();
        console.log(`Email sent successfully to ${userEmail}:`, result);
        return result;
      });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;

    console.log(`Emails sent: ${successCount} success, ${failCount} failed`);

    // Update product status
    const newStatus = notificationType === "ordered" ? "ordered" : "arrived";
    const { error: updateProductError } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", productId);

    if (updateProductError) {
      console.error("Error updating product status:", updateProductError);
    }

    // Update reservation statuses
    const reservationStatus = notificationType === "ordered" ? "ordered" : "ready";
    const { error: updateReservationsError } = await supabase
      .from("reservations")
      .update({ status: reservationStatus })
      .eq("product_id", productId);

    if (updateReservationsError) {
      console.error("Error updating reservation statuses:", updateReservationsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successCount,
        emailsFailed: failCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

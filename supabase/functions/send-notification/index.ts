import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

// Input validation schema
const notificationSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  notificationType: z.enum(["ordered", "arrived"], {
    errorMap: () => ({ message: "Invalid notification type. Must be 'ordered' or 'arrived'" })
  })
});

// HMAC signature verification
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const signatureBytes = new Uint8Array(signatureBuffer);
    const hexBytes = hexEncode(signatureBytes);
    const expectedSignature = new TextDecoder().decode(hexBytes);
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Replace template variables with actual values
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// Build the email wrapper with site branding
function wrapEmailContent(bodyHtml: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #5c6b5a; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="color: #5c6b5a; font-size: 24px; margin: 0; font-family: 'Playfair Display', Georgia, serif;">
          Klitmøllers Indkøbsforening
        </h1>
      </div>
      
      <div style="color: #333;">
        ${bodyHtml}
      </div>
      
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px;">
        <p style="margin: 0;">Med venlig hilsen,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold;">Klitmøllers Indkøbsforening</p>
      </div>
    </div>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get signing key for HMAC verification
    const SIGNING_KEY = Deno.env.get("EDGE_FUNCTION_SIGNING_KEY");
    if (!SIGNING_KEY) {
      console.error("EDGE_FUNCTION_SIGNING_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify HMAC signature
    const signature = req.headers.get("X-Signature");
    if (!signature) {
      console.error("Missing X-Signature header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate input
    let rawBody: string;
    let parsedBody;
    try {
      rawBody = await req.text();
      parsedBody = JSON.parse(rawBody);
    } catch {
      console.error("Invalid JSON in request body");
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify HMAC signature against raw body
    const isValidSignature = await verifySignature(rawBody, signature, SIGNING_KEY);
    if (!isValidSignature) {
      console.error("Invalid HMAC signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("HMAC signature verified successfully");

    const validation = notificationSchema.safeParse(parsedBody);
    if (!validation.success) {
      console.error("Input validation failed:", validation.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { productId, notificationType } = validation.data;

    console.log(`Sending ${notificationType} notification for product ${productId}`);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("Product not found");
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Product found: ${product.title}`);

    // Get email template from database
    const templateKey = notificationType === "ordered" ? "product_ordered" : "product_arrived";
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching email template:", templateError);
    }

    // Get MobilePay number from CMS
    const { data: paymentInfo } = await supabase
      .from("cms_content")
      .select("content")
      .eq("key", "payment_info")
      .maybeSingle();
    
    const mobilepayNumber = paymentInfo?.content || "xxx-xxxxx";

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

        // Prepare template variables
        const variables: Record<string, string> = {
          user_name: userName,
          user_email: userEmail,
          product_title: product.title,
          quantity: reservation.quantity.toString(),
          unit_name: product.unit_name,
          price_per_unit: product.price_per_unit.toString(),
          total_price: totalPrice,
          mobilepay_number: mobilepayNumber,
          paid_at: new Date().toLocaleDateString('da-DK'),
        };

        let subject: string;
        let bodyHtml: string;

        if (emailTemplate) {
          // Use template from database
          subject = replaceTemplateVariables(emailTemplate.subject, variables);
          bodyHtml = replaceTemplateVariables(emailTemplate.body_html, variables);
        } else {
          // Fallback to hardcoded template
          subject = notificationType === "ordered"
            ? `🛒 ${product.title} er nu bestilt!`
            : `📦 ${product.title} er kommet hjem!`;

          const statusText = notificationType === "ordered"
            ? "er nu bestilt hos leverandøren"
            : "er ankommet og klar til afhentning";

          const paymentNote = notificationType === "arrived"
            ? `<p style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 20px;">
                <strong>💳 Betaling:</strong> Betal venligst via MobilePay til ${mobilepayNumber}. 
                Husk at skrive dit navn i beskeden.
              </p>`
            : "";

          bodyHtml = `
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
          `;
        }

        // Wrap content with branded layout
        const fullHtml = wrapEmailContent(bodyHtml);

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
            html: fullHtml,
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

    // Update reservation statuses based on notification type
    const reservationStatus = notificationType === "ordered" ? "ordered" : "ready";
    const { error: updateReservationsError } = await supabase
      .from("reservations")
      .update({ status: reservationStatus })
      .eq("product_id", productId);

    if (updateReservationsError) {
      console.error("Error updating reservation statuses:", updateReservationsError);
    }

    console.log(`Updated reservation statuses to ${reservationStatus}`);

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

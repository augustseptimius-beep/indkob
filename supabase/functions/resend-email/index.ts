import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function inlineListStyles(html: string): string {
  return html
    .replace(/<ul(?=[>\s])/g, '<ul style="list-style-type: disc; padding-left: 20px; margin: 8px 0;"')
    .replace(/<ol(?=[>\s])/g, '<ol style="list-style-type: decimal; padding-left: 20px; margin: 8px 0;"')
    .replace(/<li(?=[>\s])/g, '<li style="margin-bottom: 4px;"');
}

function wrapEmailContent(bodyHtml: string): string {
  const styledBody = inlineListStyles(bodyHtml);
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #5c6b5a; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="color: #5c6b5a; font-size: 24px; margin: 0; font-family: 'Playfair Display', Georgia, serif;">
          Klitmøllers Indkøbsfællesskab
        </h1>
      </div>
      <div style="color: #333;">
        ${styledBody}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px;">
        <p style="margin: 0;">Med venlig hilsen,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold;">Klitmøllers Indkøbsfællesskab</p>
      </div>
    </div>
  `;
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { emailLogId } = await req.json();
    if (!emailLogId) {
      return new Response(JSON.stringify({ error: "emailLogId is required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the original email log entry
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("id", emailLogId)
      .single();

    if (logError || !logEntry) {
      return new Response(JSON.stringify({ error: "Email log not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If a template_key exists, re-render it with fresh data
    let subject = logEntry.subject;
    let bodyHtml = "";

    if (logEntry.template_key) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("key", logEntry.template_key)
        .eq("is_active", true)
        .maybeSingle();

      if (template) {
        // Build variables based on available data
        const variables: Record<string, string> = {};
        
        // Get user info if available
        if (logEntry.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", logEntry.user_id)
            .maybeSingle();
          variables.user_name = profile?.full_name || logEntry.recipient_name || "Kære medlem";
          variables.user_email = logEntry.recipient_email;
        } else {
          variables.user_name = logEntry.recipient_name || "Kære medlem";
          variables.user_email = logEntry.recipient_email;
        }

        // Get product info if available
        if (logEntry.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("*")
            .eq("id", logEntry.product_id)
            .maybeSingle();
          if (product) {
            variables.product_title = product.title;
            variables.product_description = product.description || "";
            variables.price_per_unit = product.price_per_unit.toString();
            variables.unit_name = product.unit_name;
            variables.target_quantity = product.target_quantity.toString();
            variables.current_quantity = product.current_quantity.toString();
            variables.remaining_quantity = (product.target_quantity - product.current_quantity).toString();
            variables.minimum_purchase = (product.minimum_purchase || 1).toString();

            // Get reservation count for this product
            const { count: reservationCount } = await supabase
              .from("reservations")
              .select("*", { count: "exact", head: true })
              .eq("product_id", logEntry.product_id);
            variables.reservation_count = (reservationCount || 0).toString();
          }
        }

        // Get reservation data (quantity, total_price) if user + product are available
        if (logEntry.user_id && logEntry.product_id) {
          const { data: reservation } = await supabase
            .from("reservations")
            .select("quantity, paid_at")
            .eq("user_id", logEntry.user_id)
            .eq("product_id", logEntry.product_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (reservation) {
            variables.quantity = reservation.quantity.toString();
            const pricePerUnit = parseFloat(variables.price_per_unit || "0");
            variables.total_price = (reservation.quantity * pricePerUnit).toFixed(2);
          }
        }

        // Get MobilePay number from CMS
        const { data: paymentInfo } = await supabase
          .from("cms_content")
          .select("content")
          .eq("key", "payment_info")
          .maybeSingle();
        variables.mobilepay_number = paymentInfo?.content || "xxx-xxxxx";

        // paid_at fallback
        variables.paid_at = new Date().toLocaleDateString("da-DK");

        // Handle batch reservation templates
        if (logEntry.template_key === "batch_reservation_confirmed" && logEntry.user_id) {
          // Find batch_id from a reservation for this user
          const { data: batchRes } = await supabase
            .from("reservations")
            .select("batch_id")
            .eq("user_id", logEntry.user_id)
            .not("batch_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (batchRes?.batch_id) {
            const { data: batchReservations } = await supabase
              .from("reservations")
              .select("quantity, product:products(title, price_per_unit, unit_name)")
              .eq("batch_id", batchRes.batch_id)
              .eq("user_id", logEntry.user_id);

            if (batchReservations && batchReservations.length > 0) {
              let totalSum = 0;
              const itemRows = batchReservations.map((r: any) => {
                const product = r.product;
                const lineTotal = r.quantity * product.price_per_unit;
                totalSum += lineTotal;
                return `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${product.title}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${r.quantity} ${product.unit_name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">${product.price_per_unit.toFixed(2)} kr</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">${lineTotal.toFixed(2)} kr</td>
                  </tr>
                `;
              }).join("");

              variables.item_count = batchReservations.length.toString();
              variables.total_sum = totalSum.toFixed(2);
              variables.items_table = `
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <thead>
                    <tr style="background-color: #f8f7f4;">
                      <th style="padding: 8px; text-align: left;">Produkt</th>
                      <th style="padding: 8px; text-align: center;">Antal</th>
                      <th style="padding: 8px; text-align: right;">Pris</th>
                      <th style="padding: 8px; text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding: 8px; font-weight: bold; text-align: right;">Total:</td>
                      <td style="padding: 8px; font-weight: bold; text-align: right;">${totalSum.toFixed(2)} kr</td>
                    </tr>
                  </tfoot>
                </table>
              `;
            }
          }
        }

        subject = replaceTemplateVariables(template.subject, variables);
        bodyHtml = replaceTemplateVariables(template.body_html, variables);
      }
    }

    // If no template was found/rendered, we can't resend without content
    if (!bodyHtml) {
      return new Response(JSON.stringify({ error: "Kunne ikke genskabe email-indhold. Skabelonen er muligvis deaktiveret eller slettet." }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const fullHtml = wrapEmailContent(bodyHtml);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Klitmøllers Indkøbsfællesskab <noreply@mail.klitkob.dk>",
        to: [logEntry.recipient_email],
        subject,
        html: fullHtml,
      }),
    });

    const emailStatus = res.ok ? "sent" : "failed";
    let errorText: string | undefined;
    if (!res.ok) {
      errorText = await res.text();
      console.error("Resend failed:", errorText);
    } else {
      console.log("Email resent successfully:", await res.json());
    }

    // Log the resend attempt
    await supabase.from("email_logs").insert({
      recipient_email: logEntry.recipient_email,
      recipient_name: logEntry.recipient_name,
      subject,
      template_key: logEntry.template_key,
      notification_type: logEntry.notification_type,
      status: emailStatus,
      error_message: errorText || null,
      product_id: logEntry.product_id,
      user_id: logEntry.user_id,
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Email kunne ikke sendes", details: errorText }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in resend-email:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

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

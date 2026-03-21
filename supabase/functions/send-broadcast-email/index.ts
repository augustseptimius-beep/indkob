import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { subject, body_html } = await req.json();
    if (!subject || !body_html) {
      return new Response(JSON.stringify({ error: "subject and body_html are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all profiles with emails
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name");

    if (profilesError || !profiles) {
      return new Response(JSON.stringify({ error: "Could not fetch profiles" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const recipients = profiles.filter((p) => p.email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const fullHtml = wrapEmailContent(body_html);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      // Personalize with user name
      const personalizedHtml = fullHtml.replace(
        /\{\{user_name\}\}/g,
        recipient.full_name || "Kære medlem"
      );
      const personalizedSubject = subject.replace(
        /\{\{user_name\}\}/g,
        recipient.full_name || "Kære medlem"
      );

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Klitmøllers Indkøbsfællesskab <noreply@mail.klitkob.dk>",
            to: [recipient.email],
            subject: personalizedSubject,
            html: personalizedHtml,
          }),
        });

        const emailStatus = res.ok ? "sent" : "failed";
        let errorText: string | undefined;
        if (!res.ok) {
          errorText = await res.text();
          console.error(`Failed to send to ${recipient.email}:`, errorText);
          failed++;
          errors.push(`${recipient.email}: ${errorText}`);
        } else {
          sent++;
        }

        // Log each email
        await supabase.from("email_logs").insert({
          recipient_email: recipient.email!,
          recipient_name: recipient.full_name,
          subject: personalizedSubject,
          notification_type: "broadcast",
          status: emailStatus,
          error_message: errorText || null,
          user_id: recipient.user_id,
        });
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        failed++;
        errors.push(`${recipient.email}: ${err.message}`);
      }

      // 2 second delay between sends
      await delay(2000);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: recipients.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-broadcast-email:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

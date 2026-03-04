import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

// Type definitions
interface Profile {
  user_id: string;
  full_name: string | null;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  price_per_unit: number;
  unit_name: string;
  target_quantity: number;
  current_quantity: number;
}

interface Reservation {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  status: string;
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

// Input validation schemas
const productNotificationSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  notificationType: z.enum(["ordered", "arrived"], {
    errorMap: () => ({ message: "Invalid notification type. Must be 'ordered' or 'arrived'" })
  })
});

const welcomeNotificationSchema = z.object({
  type: z.literal("welcome"),
  userId: z.string().uuid("Invalid user ID format")
});

const reservationNotificationSchema = z.object({
  type: z.enum(["reservation_confirmed", "reservation_cancelled"]),
  reservationId: z.string().uuid("Invalid reservation ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.number()
});

const newProductNotificationSchema = z.object({
  type: z.literal("new_product"),
  productId: z.string().uuid("Invalid product ID format")
});

const productTargetReachedSchema = z.object({
  type: z.literal("product_target_reached"),
  productId: z.string().uuid("Invalid product ID format")
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
          Klitmøllers Indkøbsfællesskab
        </h1>
      </div>
      
      <div style="color: #333;">
        ${bodyHtml}
      </div>
      
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px;">
        <p style="margin: 0;">Med venlig hilsen,</p>
        <p style="margin: 4px 0 0 0; font-weight: bold;">Klitmøllers Indkøbsfællesskab</p>
      </div>
    </div>
  `;
}

// Log email to database
async function logEmail(
  supabase: SupabaseClient,
  params: {
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    templateKey?: string | null;
    notificationType: string;
    status: "sent" | "failed";
    errorMessage?: string | null;
    productId?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  try {
    await supabase.from("email_logs").insert({
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      subject: params.subject,
      template_key: params.templateKey || null,
      notification_type: params.notificationType,
      status: params.status,
      error_message: params.errorMessage || null,
      product_id: params.productId || null,
      user_id: params.userId || null,
    });
  } catch (err) {
    console.error("Failed to log email:", err);
  }
}

// Context for logging
interface EmailContext {
  supabase: SupabaseClient;
  notificationType: string;
  templateKey?: string | null;
  productId?: string | null;
  userId?: string | null;
  recipientName?: string | null;
}

// Send email via Resend
async function sendEmail(
  to: string[],
  subject: string,
  bodyHtml: string,
  resendApiKey: string,
  logCtx?: EmailContext
): Promise<{ success: boolean; error?: string }> {
  const fullHtml = wrapEmailContent(bodyHtml);
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Klitmøllers Indkøbsfællesskab <noreply@mail.klitkob.dk>",
      to,
      subject,
      html: fullHtml,
    }),
  });

  const emailStatus = res.ok ? "sent" as const : "failed" as const;
  let errorText: string | undefined;

  if (!res.ok) {
    errorText = await res.text();
    console.error(`Failed to send email:`, errorText);
  } else {
    const result = await res.json();
    console.log(`Email sent successfully:`, result);
  }

  // Log each recipient
  if (logCtx) {
    for (const recipient of to) {
      await logEmail(logCtx.supabase, {
        recipientEmail: recipient,
        recipientName: logCtx.recipientName,
        subject,
        templateKey: logCtx.templateKey,
        notificationType: logCtx.notificationType,
        status: emailStatus,
        errorMessage: errorText || null,
        productId: logCtx.productId,
        userId: logCtx.userId,
      });
    }
  }

  return { success: res.ok, error: errorText };
}

// Get email template from database
async function getEmailTemplate(
  supabase: SupabaseClient,
  templateKey: string
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching email template:", error);
    return null;
  }
  return data as EmailTemplate | null;
}

// Get user profile and email from auth
async function getProfileWithEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<{ email: string | null; full_name: string | null } | null> {
  // Get email from auth.users (secure, not stored in public table)
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    console.error("Error fetching auth user:", authError);
    return null;
  }

  // Get full_name from profiles
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
  }

  return {
    email: authUser.user.email || null,
    full_name: data?.full_name || null,
  };
}

// Get product details
async function getProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }
  return data as Product;
}

// Get admin emails via auth admin API
async function getAdminEmails(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: adminRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (rolesError || !adminRoles?.length) {
    console.error("Error fetching admin roles:", rolesError);
    return [];
  }

  const emails: string[] = [];
  for (const role of adminRoles as { user_id: string }[]) {
    const { data: authUser } = await supabase.auth.admin.getUserById(role.user_id);
    if (authUser?.user?.email) {
      emails.push(authUser.user.email);
    }
  }
  return emails;
}

// Get all member emails via auth admin API
async function getAllMemberEmails(
  supabase: SupabaseClient
): Promise<Array<{ email: string; full_name: string | null }>> {
  // Get all profiles for full_name
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, full_name");

  if (error || !profiles) {
    console.error("Error fetching profiles:", error);
    return [];
  }

  const results: Array<{ email: string; full_name: string | null }> = [];
  for (const profile of profiles as Array<{ user_id: string; full_name: string | null }>) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    if (authUser?.user?.email) {
      results.push({ email: authUser.user.email, full_name: profile.full_name });
    }
  }
  return results;
}

// Handle welcome email
async function handleWelcomeEmail(
  supabase: SupabaseClient,
  userId: string,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number }> {
  const profile = await getProfileWithEmail(supabase, userId);
  if (!profile?.email) {
    console.log("No email found for user");
    return { success: true, emailsSent: 0 };
  }

  const template = await getEmailTemplate(supabase, "welcome");
  if (!template) {
    console.log("Welcome template not found or inactive");
    return { success: true, emailsSent: 0 };
  }

  const variables = {
    user_name: profile.full_name || "Kære medlem",
    user_email: profile.email,
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const bodyHtml = replaceTemplateVariables(template.body_html, variables);

  const result = await sendEmail([profile.email], subject, bodyHtml, resendApiKey, {
    supabase, notificationType: "welcome", templateKey: "welcome", userId, recipientName: profile.full_name,
  });
  return { success: result.success, emailsSent: result.success ? 1 : 0 };
}

// Handle reservation notification
async function handleReservationEmail(
  supabase: SupabaseClient,
  type: "reservation_confirmed" | "reservation_cancelled",
  userId: string,
  productId: string,
  quantity: number,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number }> {
  const [profile, product] = await Promise.all([
    getProfileWithEmail(supabase, userId),
    getProduct(supabase, productId),
  ]);

  if (!profile?.email || !product) {
    console.log("Missing profile email or product");
    return { success: true, emailsSent: 0 };
  }

  const templateKey = type === "reservation_confirmed" ? "reservation_confirmed" : "reservation_cancelled";
  const template = await getEmailTemplate(supabase, templateKey);
  if (!template) {
    console.log(`Template ${templateKey} not found or inactive`);
    return { success: true, emailsSent: 0 };
  }

  const totalPrice = (quantity * product.price_per_unit).toFixed(2);
  const variables = {
    user_name: profile.full_name || "Kære medlem",
    user_email: profile.email,
    product_title: product.title,
    quantity: quantity.toString(),
    unit_name: product.unit_name,
    price_per_unit: product.price_per_unit.toString(),
    total_price: totalPrice,
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const bodyHtml = replaceTemplateVariables(template.body_html, variables);

  const result = await sendEmail([profile.email], subject, bodyHtml, resendApiKey, {
    supabase, notificationType: type, templateKey, productId, userId, recipientName: profile.full_name,
  });
  return { success: result.success, emailsSent: result.success ? 1 : 0 };
}

// Handle new product notification to all members
async function handleNewProductEmail(
  supabase: SupabaseClient,
  productId: string,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number; emailsFailed: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    console.log("Product not found");
    return { success: false, emailsSent: 0, emailsFailed: 0 };
  }

  const template = await getEmailTemplate(supabase, "new_product");
  if (!template) {
    console.log("New product template not found or inactive");
    return { success: true, emailsSent: 0, emailsFailed: 0 };
  }

  const members = await getAllMemberEmails(supabase);
  if (members.length === 0) {
    console.log("No members to notify");
    return { success: true, emailsSent: 0, emailsFailed: 0 };
  }

  console.log(`Sending new product email to ${members.length} members`);

  let emailsSent = 0;
  let emailsFailed = 0;

  for (const member of members) {
    const variables = {
      user_name: member.full_name || "Kære medlem",
      user_email: member.email,
      product_title: product.title,
      product_description: product.description || "",
      price_per_unit: product.price_per_unit.toString(),
      unit_name: product.unit_name,
      target_quantity: product.target_quantity.toString(),
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const bodyHtml = replaceTemplateVariables(template.body_html, variables);

    const result = await sendEmail([member.email], subject, bodyHtml, resendApiKey, {
      supabase, notificationType: "new_product", templateKey: "new_product", productId, recipientName: member.full_name,
    });
    if (result.success) {
      emailsSent++;
    } else {
      emailsFailed++;
    }
  }

  return { success: true, emailsSent, emailsFailed };
}

// Handle product target reached notification to admins
async function handleProductTargetReachedEmail(
  supabase: SupabaseClient,
  productId: string,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    console.log("Product not found");
    return { success: false, emailsSent: 0 };
  }

  const template = await getEmailTemplate(supabase, "product_target_reached");
  if (!template) {
    console.log("Product target reached template not found or inactive");
    return { success: true, emailsSent: 0 };
  }

  const adminEmails = await getAdminEmails(supabase);
  if (adminEmails.length === 0) {
    console.log("No admin emails found");
    return { success: true, emailsSent: 0 };
  }

  // Get reservation count
  const { count: reservationCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  const variables = {
    product_title: product.title,
    current_quantity: product.current_quantity.toString(),
    target_quantity: product.target_quantity.toString(),
    unit_name: product.unit_name,
    reservation_count: (reservationCount || 0).toString(),
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const bodyHtml = replaceTemplateVariables(template.body_html, variables);

  console.log(`Sending target reached email to ${adminEmails.length} admins`);
  const result = await sendEmail(adminEmails, subject, bodyHtml, resendApiKey, {
    supabase, notificationType: "product_target_reached", templateKey: "product_target_reached", productId,
  });
  return { success: result.success, emailsSent: result.success ? adminEmails.length : 0 };
}

// Handle product status change (ordered/arrived) - original functionality
async function handleProductStatusEmail(
  supabase: SupabaseClient,
  productId: string,
  notificationType: "ordered" | "arrived",
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number; emailsFailed: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    return { success: false, emailsSent: 0, emailsFailed: 0 };
  }

  console.log(`Product found: ${product.title}`);

  const templateKey = notificationType === "ordered" ? "product_ordered" : "product_arrived";
  const emailTemplate = await getEmailTemplate(supabase, templateKey);

  // Get MobilePay number from CMS
  const { data: paymentInfo } = await supabase
    .from("cms_content")
    .select("content")
    .eq("key", "payment_info")
    .maybeSingle();
  
  const mobilepayNumber = (paymentInfo as { content: string | null } | null)?.content || "xxx-xxxxx";

  // Get all reservations for this product
  const { data: reservations, error: reservationsError } = await supabase
    .from("reservations")
    .select("*")
    .eq("product_id", productId);

  if (reservationsError) {
    console.error("Error fetching reservations:", reservationsError);
    throw new Error("Could not fetch reservations");
  }

  const typedReservations = reservations as Reservation[] | null;
  console.log(`Found ${typedReservations?.length || 0} reservations`);

  if (!typedReservations || typedReservations.length === 0) {
    return { success: true, emailsSent: 0, emailsFailed: 0 };
  }

  // Get unique user IDs from reservations
  const userIds = [...new Set(typedReservations.map(r => r.user_id))];
  
  // Fetch profiles and emails for these users via auth admin API
  const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
  for (const uid of userIds) {
    const profileWithEmail = await getProfileWithEmail(supabase, uid);
    if (profileWithEmail) {
      profileMap.set(uid, profileWithEmail);
    }
  }

  // Send emails to all users who reserved
  const emailPromises = typedReservations
    .filter(r => {
      const profile = profileMap.get(r.user_id);
      return profile?.email;
    })
    .map(async (reservation) => {
      const profile = profileMap.get(reservation.user_id)!;
      const userEmail = profile.email!;
      const userName = profile.full_name || "Kære medlem";
      const totalPrice = (reservation.quantity * product.price_per_unit).toFixed(2);

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
        subject = replaceTemplateVariables(emailTemplate.subject, variables);
        bodyHtml = replaceTemplateVariables(emailTemplate.body_html, variables);
      } else {
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

      console.log(`Sending email to ${userEmail}`);
      return sendEmail([userEmail], subject, bodyHtml, resendApiKey, {
        supabase, notificationType, templateKey, productId: product.id, userId: reservation.user_id, recipientName: userName,
      });
    });

  const results = await Promise.allSettled(emailPromises);
  
  const successCount = results.filter(r => r.status === "fulfilled" && r.value.success).length;
  const failCount = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length;

  // Update reservation statuses
  const reservationStatus = notificationType === "ordered" ? "ordered" : "ready";
  await supabase
    .from("reservations")
    .update({ status: reservationStatus })
    .eq("product_id", productId);

  console.log(`Updated reservation statuses to ${reservationStatus}`);

  return { success: true, emailsSent: successCount, emailsFailed: failCount };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SIGNING_KEY = Deno.env.get("EDGE_FUNCTION_SIGNING_KEY");
    if (!SIGNING_KEY) {
      console.error("EDGE_FUNCTION_SIGNING_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    let rawBody: string;
    let parsedBody: Record<string, unknown>;
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

    const isValidSignature = await verifySignature(rawBody, signature, SIGNING_KEY);
    if (!isValidSignature) {
      console.error("Invalid HMAC signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("HMAC signature verified successfully");
    console.log("Request body:", parsedBody);

    let result: { success: boolean; emailsSent: number; emailsFailed?: number };

    // Determine notification type based on request body
    if (parsedBody.type === "welcome") {
      const validation = welcomeNotificationSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending welcome email for user ${validation.data.userId}`);
      result = await handleWelcomeEmail(supabase, validation.data.userId, RESEND_API_KEY);

    } else if (parsedBody.type === "reservation_confirmed" || parsedBody.type === "reservation_cancelled") {
      const validation = reservationNotificationSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending ${validation.data.type} email for reservation ${validation.data.reservationId}`);
      result = await handleReservationEmail(
        supabase,
        validation.data.type,
        validation.data.userId,
        validation.data.productId,
        validation.data.quantity,
        RESEND_API_KEY
      );

    } else if (parsedBody.type === "new_product") {
      const validation = newProductNotificationSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending new product email for product ${validation.data.productId}`);
      result = await handleNewProductEmail(supabase, validation.data.productId, RESEND_API_KEY);

    } else if (parsedBody.type === "product_target_reached") {
      const validation = productTargetReachedSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending product target reached email for product ${validation.data.productId}`);
      result = await handleProductTargetReachedEmail(supabase, validation.data.productId, RESEND_API_KEY);

    } else if (parsedBody.productId && parsedBody.notificationType) {
      // Legacy format for product status changes
      const validation = productNotificationSchema.safeParse(parsedBody);
      if (!validation.success) {
        console.error("Input validation failed:", validation.error.errors);
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending ${validation.data.notificationType} notification for product ${validation.data.productId}`);
      result = await handleProductStatusEmail(
        supabase,
        validation.data.productId,
        validation.data.notificationType,
        RESEND_API_KEY
      );

    } else {
      console.error("Unknown notification type:", parsedBody);
      return new Response(
        JSON.stringify({ error: "Unknown notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: result.success, 
        emailsSent: result.emailsSent,
        emailsFailed: result.emailsFailed || 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

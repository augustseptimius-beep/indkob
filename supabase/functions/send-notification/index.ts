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
  notificationType: z.literal("ordered"),
  reservationIds: z.array(z.string().uuid()).optional(),
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

const productAlmostReachedSchema = z.object({
  type: z.literal("product_almost_reached"),
  productId: z.string().uuid("Invalid product ID format")
});

const paymentConfirmedSchema = z.object({
  type: z.literal("payment_confirmed"),
  reservationId: z.string().uuid("Invalid reservation ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.number()
});

const batchReservationSchema = z.object({
  type: z.literal("batch_reservation_confirmed"),
  batchId: z.string().uuid("Invalid batch ID format"),
  userId: z.string().uuid("Invalid user ID format"),
});

const readyForPickupSchema = z.object({
  type: z.literal("ready_for_pickup"),
  productId: z.string().uuid("Invalid product ID format"),
  reservationIds: z.array(z.string().uuid()).min(1),
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
function inlineListStyles(html: string): string {
  // Add inline styles to ul/ol/li elements for email client compatibility
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

  for (let i = 0; i < members.length; i++) {
    // Wait 600ms between emails to stay under Resend's 2 req/sec limit
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const member = members[i];
    const siteUrl = Deno.env.get("SITE_URL") || "https://indkob.lovable.app";
    const productUrl = `${siteUrl}/produkt/${product.id}`;
    const variables = {
      user_name: member.full_name || "Kære medlem",
      user_email: member.email,
      product_title: product.title,
      product_description: product.description || "",
      price_per_unit: product.price_per_unit.toString(),
      unit_name: product.unit_name,
      target_quantity: product.target_quantity.toString(),
      product_url: productUrl,
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

// Handle product almost reached notification to all members
async function handleProductAlmostReachedEmail(
  supabase: SupabaseClient,
  productId: string,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number; emailsFailed: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    console.log("Product not found");
    return { success: false, emailsSent: 0, emailsFailed: 0 };
  }

  const template = await getEmailTemplate(supabase, "product_almost_reached");
  
  const members = await getAllMemberEmails(supabase);
  if (members.length === 0) {
    console.log("No members to notify");
    return { success: true, emailsSent: 0, emailsFailed: 0 };
  }

  const remaining = product.target_quantity - product.current_quantity;

  console.log(`Sending product almost reached email to ${members.length} members`);

  let emailsSent = 0;
  let emailsFailed = 0;

  for (let i = 0; i < members.length; i++) {
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const member = members[i];
    const variables = {
      user_name: member.full_name || "Kære medlem",
      user_email: member.email,
      product_title: product.title,
      remaining_quantity: remaining.toString(),
      current_quantity: product.current_quantity.toString(),
      target_quantity: product.target_quantity.toString(),
      unit_name: product.unit_name,
      price_per_unit: product.price_per_unit.toString(),
      minimum_purchase: product.minimum_purchase?.toString() || "1",
    };

    let subject: string;
    let bodyHtml: string;

    if (template) {
      subject = replaceTemplateVariables(template.subject, variables);
      bodyHtml = replaceTemplateVariables(template.body_html, variables);
    } else {
      subject = `🔥 ${product.title} mangler kun ${remaining} ${product.unit_name} — hjælp os i mål!`;
      bodyHtml = `
        <p>Hej ${variables.user_name},</p>
        <p><strong>${product.title}</strong> er tæt på at nå sit mål! Der mangler kun <strong>${remaining} ${product.unit_name}</strong> før vi kan bestille hjem.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fbbf24;">
          <p style="margin: 0 0 8px 0;"><strong>Status:</strong> ${product.current_quantity} af ${product.target_quantity} ${product.unit_name} tilmeldt</p>
          <p style="margin: 0 0 8px 0;"><strong>Pris:</strong> ${product.price_per_unit} kr/${product.unit_name}</p>
          <p style="margin: 0;"><strong>Mangler:</strong> ${remaining} ${product.unit_name}</p>
        </div>
        
        <p>Gå ind på <a href="https://indkob.lovable.app/produkter" style="color: #5c6b5a; font-weight: bold;">vores side</a> og tilmeld dig, så vi kan nå målet! 🎯</p>
      `;
    }

    const result = await sendEmail([member.email], subject, bodyHtml, resendApiKey, {
      supabase, notificationType: "product_almost_reached", templateKey: "product_almost_reached", productId, recipientName: member.full_name,
    });
    if (result.success) {
      emailsSent++;
    } else {
      emailsFailed++;
    }
  }

  return { success: true, emailsSent, emailsFailed };
}

// Handle payment confirmation email
async function handlePaymentConfirmedEmail(
  supabase: SupabaseClient,
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
    console.log("Missing profile email or product for payment confirmation");
    return { success: true, emailsSent: 0 };
  }

  const template = await getEmailTemplate(supabase, "payment_confirmed");
  const totalPrice = (quantity * product.price_per_unit).toFixed(2);
  const variables = {
    user_name: profile.full_name || "Kære medlem",
    user_email: profile.email,
    product_title: product.title,
    quantity: quantity.toString(),
    unit_name: product.unit_name,
    price_per_unit: product.price_per_unit.toString(),
    total_price: totalPrice,
    paid_at: new Date().toLocaleDateString("da-DK"),
  };

  let subject: string;
  let bodyHtml: string;

  if (template) {
    subject = replaceTemplateVariables(template.subject, variables);
    bodyHtml = replaceTemplateVariables(template.body_html, variables);
  } else {
    subject = `✅ Betalingsbekræftelse — ${product.title}`;
    bodyHtml = `
      <p>Hej ${variables.user_name},</p>
      <p>Vi bekræfter hermed, at vi har modtaget din betaling for <strong>${product.title}</strong>.</p>
      
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <h3 style="margin-top: 0; color: #166534;">Betalingskvittering</h3>
        <p><strong>Produkt:</strong> ${product.title}</p>
        <p><strong>Antal:</strong> ${quantity} ${product.unit_name}</p>
        <p><strong>Pris pr. enhed:</strong> ${product.price_per_unit} kr.</p>
        <p><strong>Total betalt:</strong> ${totalPrice} kr.</p>
        <p><strong>Dato:</strong> ${variables.paid_at}</p>
      </div>

      <p>Tak for din betaling! 🎉</p>
    `;
  }

  const result = await sendEmail([profile.email], subject, bodyHtml, resendApiKey, {
    supabase, notificationType: "payment_confirmed", templateKey: "payment_confirmed", productId, userId, recipientName: profile.full_name,
  });
  return { success: result.success, emailsSent: result.success ? 1 : 0 };
}

// Handle batch reservation confirmation email
async function handleBatchReservationEmail(
  supabase: SupabaseClient,
  batchId: string,
  userId: string,
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number }> {
  const profile = await getProfileWithEmail(supabase, userId);
  if (!profile?.email) {
    console.log("No email found for user");
    return { success: true, emailsSent: 0 };
  }

  // Get all reservations for this batch
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*, product:products(*)")
    .eq("batch_id", batchId)
    .eq("user_id", userId);

  if (error || !reservations || reservations.length === 0) {
    console.log("No reservations found for batch", error);
    return { success: true, emailsSent: 0 };
  }

  // Try to use template
  const template = await getEmailTemplate(supabase, "batch_reservation_confirmed");

  // Build items table HTML
  let totalSum = 0;
  const itemRows = reservations.map((r: any) => {
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

  const userName = profile.full_name || "Kære medlem";

  let subject: string;
  let bodyHtml: string;

  if (template) {
    const variables = {
      user_name: userName,
      user_email: profile.email,
      item_count: reservations.length.toString(),
      total_sum: totalSum.toFixed(2),
      items_table: `
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
      `,
    };
    subject = replaceTemplateVariables(template.subject, variables);
    bodyHtml = replaceTemplateVariables(template.body_html, variables);
  } else {
    subject = `✅ Reservationsbekræftelse — ${reservations.length} ${reservations.length === 1 ? 'produkt' : 'produkter'}`;
    bodyHtml = `
      <p>Hej ${userName},</p>
      <p>Vi bekræfter hermed dine reservationer:</p>
      
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

      <p>Du vil modtage besked, når varerne er klar til betaling og afhentning.</p>
      <p>Se dine reservationer på <a href="https://indkob.lovable.app/min-side" style="color: #5c6b5a; font-weight: bold;">Min side</a>.</p>
    `;
  }

  const result = await sendEmail([profile.email], subject, bodyHtml, resendApiKey, {
    supabase, notificationType: "batch_reservation_confirmed", templateKey: "batch_reservation_confirmed", userId, recipientName: userName,
  });
  return { success: result.success, emailsSent: result.success ? 1 : 0 };
}

// Handle ready for pickup notification — admin marks batch as arrived
async function handleReadyForPickupEmail(
  supabase: SupabaseClient,
  productId: string,
  reservationIds: string[],
  resendApiKey: string
): Promise<{ success: boolean; emailsSent: number; emailsFailed: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    return { success: false, emailsSent: 0, emailsFailed: 0 };
  }

  // Get MobilePay number from CMS
  const { data: paymentInfo } = await supabase
    .from("cms_content")
    .select("content")
    .eq("key", "payment_info")
    .maybeSingle();
  const mobilepayNumber = (paymentInfo as { content: string | null } | null)?.content || "xxx-xxxxx";

  // Get the specific reservations
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*")
    .in("id", reservationIds);

  if (error || !reservations || reservations.length === 0) {
    console.error("No reservations found:", error);
    return { success: true, emailsSent: 0, emailsFailed: 0 };
  }

  const typedReservations = reservations as Reservation[];
  const templateKey = "ready_for_pickup";
  const emailTemplate = await getEmailTemplate(supabase, templateKey);

  // Get user profiles
  const userIds = [...new Set(typedReservations.map(r => r.user_id))];
  const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
  for (const uid of userIds) {
    const p = await getProfileWithEmail(supabase, uid);
    if (p) profileMap.set(uid, p);
  }

  const eligible = typedReservations.filter(r => profileMap.get(r.user_id)?.email);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < eligible.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 600));

    const reservation = eligible[i];
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
    };

    let subject: string;
    let bodyHtml: string;

    if (emailTemplate) {
      subject = replaceTemplateVariables(emailTemplate.subject, variables);
      bodyHtml = replaceTemplateVariables(emailTemplate.body_html, variables);
    } else {
      subject = `📦 ${product.title} er klar til afhentning!`;
      bodyHtml = `
        <p>Hej ${userName},</p>
        <p>Gode nyheder! <strong>${product.title}</strong> er ankommet og klar til afhentning.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3 style="margin-top: 0; color: #166534;">Din reservation:</h3>
          <p><strong>Produkt:</strong> ${product.title}</p>
          <p><strong>Antal:</strong> ${reservation.quantity} ${product.unit_name}</p>
          <p><strong>Pris pr. enhed:</strong> ${product.price_per_unit} kr.</p>
          <p><strong>Total:</strong> ${totalPrice} kr.</p>
        </div>
        
        <p style="background-color: #fef3c7; padding: 16px; border-radius: 8px;">
          <strong>💳 Betaling:</strong> Betal venligst via MobilePay til ${mobilepayNumber}. 
          Husk at skrive dit navn i beskeden.
        </p>
        
        <p>Se dine reservationer på <a href="https://indkob.lovable.app/min-side" style="color: #5c6b5a; font-weight: bold;">Min side</a>.</p>
      `;
    }

    const result = await sendEmail([userEmail], subject, bodyHtml, resendApiKey, {
      supabase, notificationType: "ready_for_pickup", templateKey, productId: product.id, userId: reservation.user_id, recipientName: userName,
    });
    if (result.success) successCount++; else failCount++;
  }

  // Update reservation statuses to 'ready'
  await supabase
    .from("reservations")
    .update({ status: "ready" })
    .in("id", reservationIds);
  console.log(`Updated ${reservationIds.length} reservations to ready`);

  return { success: true, emailsSent: successCount, emailsFailed: failCount };
}

// Handle product status change (ordered) - original functionality
async function handleProductStatusEmail(
  supabase: SupabaseClient,
  productId: string,
  resendApiKey: string,
  reservationIds?: string[]
): Promise<{ success: boolean; emailsSent: number; emailsFailed: number }> {
  const product = await getProduct(supabase, productId);
  if (!product) {
    return { success: false, emailsSent: 0, emailsFailed: 0 };
  }

  console.log(`Product found: ${product.title}`);

  const templateKey = "product_ordered";
  const emailTemplate = await getEmailTemplate(supabase, templateKey);

  // Get reservations - only specific IDs if provided, otherwise all for this product
  let query = supabase
    .from("reservations")
    .select("*")
    .eq("product_id", productId);
  
  if (reservationIds && reservationIds.length > 0) {
    query = query.in("id", reservationIds);
    console.log(`Filtering to ${reservationIds.length} specific reservation IDs`);
  }

  const { data: reservations, error: reservationsError } = await query;

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

  // Send emails sequentially with delay to avoid Resend rate limiting (max 2/sec)
  const eligibleReservations = typedReservations.filter(r => {
    const profile = profileMap.get(r.user_id);
    return profile?.email;
  });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < eligibleReservations.length; i++) {
    // Wait 600ms between emails to stay under 2 req/sec limit
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const reservation = eligibleReservations[i];
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
    };

    let subject: string;
    let bodyHtml: string;

    if (emailTemplate) {
      subject = replaceTemplateVariables(emailTemplate.subject, variables);
      bodyHtml = replaceTemplateVariables(emailTemplate.body_html, variables);
    } else {
      subject = `🛒 ${product.title} er nu bestilt!`;

      bodyHtml = `
        <p>Hej ${userName},</p>
        <p>Vi vil gerne informere dig om, at <strong>${product.title}</strong> er nu bestilt hos leverandøren.</p>
        
        <div style="background-color: #f8f7f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Din reservation:</h3>
          <p><strong>Produkt:</strong> ${product.title}</p>
          <p><strong>Antal:</strong> ${reservation.quantity} ${product.unit_name}</p>
          <p><strong>Pris pr. enhed:</strong> ${product.price_per_unit} kr.</p>
          <p><strong>Total:</strong> ${totalPrice} kr.</p>
        </div>
      `;
    }

    console.log(`Sending email to ${userEmail}`);
    const result = await sendEmail([userEmail], subject, bodyHtml, resendApiKey, {
      supabase, notificationType: "ordered", templateKey, productId: product.id, userId: reservation.user_id, recipientName: userName,
    });
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return { success: true, emailsSent: successCount, emailsFailed: failCount };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SIGNING_KEY = Deno.env.get("EDGE_FUNCTION_SIGNING_KEY");
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

    // Auth: accept either HMAC signature or JWT for batch requests
    const signature = req.headers.get("X-Signature");
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (signature && SIGNING_KEY) {
      const isValidSignature = await verifySignature(rawBody, signature, SIGNING_KEY);
      if (!isValidSignature) {
        console.error("Invalid HMAC signature");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("HMAC signature verified successfully");
    } else if (authHeader && (parsedBody.type === "batch_reservation_confirmed" || parsedBody.type === "ready_for_pickup")) {
      // For batch requests from frontend, verify JWT
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error: authError } = await userClient.auth.getUser(token);
      if (authError || !user) {
        console.error("Invalid JWT:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      authenticatedUserId = user.id;
      console.log("JWT verified for user:", authenticatedUserId);
    } else {
      console.error("No valid authentication provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
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

    } else if (parsedBody.type === "product_almost_reached") {
      const validation = productAlmostReachedSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending product almost reached email for product ${validation.data.productId}`);
      result = await handleProductAlmostReachedEmail(supabase, validation.data.productId, RESEND_API_KEY);

    } else if (parsedBody.type === "payment_confirmed") {
      const validation = paymentConfirmedSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending payment confirmation for reservation ${validation.data.reservationId}`);
      result = await handlePaymentConfirmedEmail(
        supabase,
        validation.data.userId,
        validation.data.productId,
        validation.data.quantity,
        RESEND_API_KEY
      );

    } else if (parsedBody.type === "batch_reservation_confirmed") {
      const validation = batchReservationSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      // Security: ensure JWT user matches requested userId
      if (authenticatedUserId && authenticatedUserId !== validation.data.userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log(`Sending batch reservation email for batch ${validation.data.batchId}`);
      result = await handleBatchReservationEmail(
        supabase,
        validation.data.batchId,
        validation.data.userId,
        RESEND_API_KEY
      );

    } else if (parsedBody.type === "ready_for_pickup") {
      const validation = readyForPickupSchema.safeParse(parsedBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request parameters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      // Verify admin role via direct query (has_role RPC fails with service-role client)
      if (authenticatedUserId) {
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", authenticatedUserId)
          .eq("role", "admin")
          .maybeSingle();
        if (!adminRole) {
          return new Response(
            JSON.stringify({ error: "Forbidden: admin role required" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
      console.log(`Sending ready for pickup email for product ${validation.data.productId}`);
      result = await handleReadyForPickupEmail(
        supabase,
        validation.data.productId,
        validation.data.reservationIds,
        RESEND_API_KEY
      );

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
      console.log(`Sending ordered notification for product ${validation.data.productId}`);
      result = await handleProductStatusEmail(
        supabase,
        validation.data.productId,
        RESEND_API_KEY,
        validation.data.reservationIds
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

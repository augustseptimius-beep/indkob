import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Data extracted from AI (internal use)
interface ExtractedProductData {
  title: string;
  description: string;
  price_total: number | null;
  price_per_kg: number | null;
  weight_kg: number | null;
  image_url: string | null;
  origin_country: string | null;
  supplier_name: string | null;
  unit_name: string;
  is_organic: boolean;
}

// Normalized data returned to client
interface ProductData {
  title: string;
  description: string;
  price: number | null;
  image_url: string | null;
  origin_country: string | null;
  supplier_name: string | null;
  unit_name: string;
  is_organic: boolean;
}

// Simple in-memory rate limiter (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max scrapes per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

// Validate URL to prevent SSRF attacks
function validateScrapeUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Only allow https
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'Kun HTTPS URLs er tilladt' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { valid: false, error: 'Lokale adresser er ikke tilladt' };
    }

    // Block private/internal IP ranges
    if (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') || hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') ||
      hostname === 'metadata.google.internal'
    ) {
      return { valid: false, error: 'Interne adresser er ikke tilladt' };
    }

    // Must have a valid TLD (at least one dot)
    if (!hostname.includes('.')) {
      return { valid: false, error: 'Ugyldig URL - mangler domæne' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Ugyldig URL format' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: require valid JWT and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ikke autoriseret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ikke autoriseret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kun administratorer kan importere produkter' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check (after auth, before expensive operations)
    if (!checkRateLimit(userId)) {
      console.warn(`Rate limit exceeded for admin ${userId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'For mange import-forespørgsler. Prøv igen om lidt.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL er påkrævet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce max URL length
    if (url.length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL er for lang (max 2048 tegn)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL against SSRF
    const urlValidation = validateScrapeUrl(formattedUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl er ikke konfigureret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI er ikke konfigureret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${userId} scraping URL: ${formattedUrl}`);

    // Step 1: Scrape the product page with Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl scrape error:', scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kunne ikke hente siden. Tjek at URL\'en er korrekt.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kunne ikke finde produktinformation på siden.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraped content length:', markdown.length);

    // Step 2: Use AI to extract structured product data
    const systemPrompt = `Du er en ekspert i at udtrække produktinformation fra websider. 
Udtrk følgende information fra det givne indhold og returner KUN et JSON objekt uden andre kommentarer:

{
  "title": "produktnavn (kort og præcis)",
  "description": "produktbeskrivelse (max 200 tegn)",
  "price_total": tal eller null (den samlede pris i kr, IKKE øre),
  "weight_kg": tal eller null (vægten i kg hvis angivet, f.eks. 22.68 for "22,68 kg"),
  "price_per_kg": tal eller null (pris pr kg hvis direkte angivet),
  "image_url": "billede URL hvis fundet" eller null,
  "origin_country": "oprindelsesland hvis nævnt" eller null,
  "supplier_name": "leverandør/brand navn" eller null,
  "unit_name": "enhed (kg, stk, pose, liter osv.)" eller "stk",
  "is_organic": true/false baseret på om produktet er økologisk
}

Vigtige regler:
- Returner KUN JSON, ingen markdown formattering
- price_total er ALTID i kroner (kr), IKKE øre
- Hvis produktet sælges i bulk (f.eks. 22,68 kg for 2899 kr), angiv BÅDE price_total OG weight_kg
- Hvis prisen er per kg/liter, angiv price_per_kg direkte og unit_name som "kg" eller "liter"
- Se efter økologi-mærker, "økologisk", "organic", Ø-mærke osv.
- Hvis leverandøren ikke er tydelig, brug webshop-navnet`;

    const userPrompt = `Uddrag produktinformation fra denne webside:

URL: ${formattedUrl}
Titel fra metadata: ${metadata.title || 'Ikke tilgængelig'}

Indhold:
${markdown.substring(0, 8000)}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'For mange forespørgsler. Prøv igen om lidt.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI-kreditter opbrugt. Kontakt administrator.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI API error:', aiResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'AI-analyse fejlede' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON from AI response
    let extractedData: ExtractedProductData;
    try {
      // Remove any markdown code block formatting
      const jsonStr = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kunne ikke analysere produktdata fra siden.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and normalize the data
    let pricePerUnit: number | null = null;
    
    // Calculate price per unit (kg)
    if (extractedData.price_per_kg !== null && typeof extractedData.price_per_kg === 'number') {
      pricePerUnit = extractedData.price_per_kg;
    } else if (extractedData.price_total !== null && extractedData.weight_kg !== null && 
               typeof extractedData.price_total === 'number' && typeof extractedData.weight_kg === 'number' &&
               extractedData.weight_kg > 0) {
      pricePerUnit = extractedData.price_total / extractedData.weight_kg;
      pricePerUnit = Math.round(pricePerUnit * 100) / 100;
    } else if (extractedData.price_total !== null && typeof extractedData.price_total === 'number') {
      pricePerUnit = extractedData.price_total;
    }
    
    // Determine the appropriate unit name
    let unitName = extractedData.unit_name || 'stk';
    if (extractedData.weight_kg !== null && extractedData.weight_kg > 0) {
      unitName = 'kg';
    }
    
    const normalizedData: ProductData = {
      title: extractedData.title || metadata.title || 'Ukendt produkt',
      description: extractedData.description || '',
      price: pricePerUnit,
      image_url: extractedData.image_url || null,
      origin_country: extractedData.origin_country || null,
      supplier_name: extractedData.supplier_name || null,
      unit_name: unitName,
      is_organic: Boolean(extractedData.is_organic),
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: normalizedData,
        source_url: formattedUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-product:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Der opstod en uventet fejl' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

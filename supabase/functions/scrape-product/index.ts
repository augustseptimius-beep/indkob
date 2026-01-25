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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL er påkrævet' }),
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

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

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
          error: scrapeData.error || 'Kunne ikke hente siden. Tjek at URL\'en er korrekt.' 
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
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI-analyse fejlede' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI response:', aiContent);

    // Parse the JSON from AI response
    let extractedData: ExtractedProductData;
    try {
      // Remove any markdown code block formatting
      const jsonStr = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
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
      // Direct price per kg was found
      pricePerUnit = extractedData.price_per_kg;
    } else if (extractedData.price_total !== null && extractedData.weight_kg !== null && 
               typeof extractedData.price_total === 'number' && typeof extractedData.weight_kg === 'number' &&
               extractedData.weight_kg > 0) {
      // Calculate price per kg from total price and weight
      pricePerUnit = extractedData.price_total / extractedData.weight_kg;
      // Round to 2 decimal places
      pricePerUnit = Math.round(pricePerUnit * 100) / 100;
    } else if (extractedData.price_total !== null && typeof extractedData.price_total === 'number') {
      // Just use the total price if no weight info (assume it's per unit)
      pricePerUnit = extractedData.price_total;
    }
    
    // Determine the appropriate unit name
    let unitName = extractedData.unit_name || 'stk';
    if (extractedData.weight_kg !== null && extractedData.weight_kg > 0) {
      unitName = 'kg'; // If we calculated from weight, unit is kg
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

    console.log('Extracted product data:', normalizedData);

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
        error: error instanceof Error ? error.message : 'Ukendt fejl' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

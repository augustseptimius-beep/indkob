import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('sync-signing-key: Starting vault sync...');

    // Get required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const signingKey = Deno.env.get('EDGE_FUNCTION_SIGNING_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('sync-signing-key: Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signingKey) {
      console.error('sync-signing-key: EDGE_FUNCTION_SIGNING_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'EDGE_FUNCTION_SIGNING_KEY is not configured as a secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('sync-signing-key: Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('sync-signing-key: Invalid token', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('sync-signing-key: Verified user:', userId);

    // Check if user is admin using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('sync-signing-key: Error checking admin role', roleError);
      return new Response(
        JSON.stringify({ error: 'Error verifying admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      console.error('sync-signing-key: User is not admin:', userId);
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('sync-signing-key: Admin verified, syncing to vault...');

    // Use service role to insert into vault
    // First, try to delete any existing secret with the same name
    const { error: deleteError } = await adminClient.rpc('vault_delete_secret', {
      secret_name: 'edge_function_signing_key'
    }).maybeSingle();
    
    // Ignore delete errors (secret might not exist)
    if (deleteError) {
      console.log('sync-signing-key: No existing secret to delete (this is normal for first run)');
    }

    // Insert the new secret into vault
    const { data: insertData, error: insertError } = await adminClient.rpc('vault_insert_secret', {
      secret_name: 'edge_function_signing_key',
      secret_value: signingKey
    });

    if (insertError) {
      console.error('sync-signing-key: Error inserting into vault', insertError);
      
      // Try alternative method using direct SQL via REST API
      // This is a fallback if the RPC functions don't exist
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/vault_insert_secret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          secret_name: 'edge_function_signing_key',
          secret_value: signingKey
        })
      });

      if (!response.ok) {
        // Final fallback: direct insert to vault.secrets
        console.log('sync-signing-key: Trying direct vault insert...');
        
        const directInsert = await fetch(`${supabaseUrl}/rest/v1/vault.secrets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            name: 'edge_function_signing_key',
            secret: signingKey
          })
        });

        if (!directInsert.ok) {
          const errorText = await directInsert.text();
          console.error('sync-signing-key: Direct vault insert failed', errorText);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to insert secret into vault', 
              details: 'The vault extension may need to be enabled. Please contact support.',
              technical: errorText
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log('sync-signing-key: Successfully synced signing key to vault!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Signing key successfully synced to vault. Email notifications will now work when product status changes.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('sync-signing-key: Unexpected error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

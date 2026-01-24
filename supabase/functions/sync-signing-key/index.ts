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

    console.log('sync-signing-key: Admin verified, syncing to vault via database function...');

    // Use the secure database function to insert the secret into vault
    const { error: rpcError } = await adminClient.rpc('upsert_vault_secret', {
      p_secret_name: 'edge_function_signing_key',
      p_secret_value: signingKey
    });

    if (rpcError) {
      console.error('sync-signing-key: Error calling upsert_vault_secret', rpcError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to sync secret to vault', 
          details: rpcError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('sync-signing-key: Successfully synced signing key to vault!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Signeringsnøgle synkroniseret til vault. Email-notifikationer vil nu fungere når produktstatus ændres.' 
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

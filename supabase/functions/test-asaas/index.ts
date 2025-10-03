import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method = 'GET', url, apiKey } = await req.json()

    if (!url || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing url or apiKey' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Make request to Asaas API
    const asaasResponse = await fetch(url, {
      method,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'CredCar-Finance/1.0'
      }
    })

    let responseData
    const contentType = asaasResponse.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await asaasResponse.json()
    } else {
      responseData = await asaasResponse.text()
    }

    return new Response(
      JSON.stringify({
        success: asaasResponse.ok,
        status: asaasResponse.status,
::statusText,
        data: responseData,
        url: url
      }),
      { 
        status: asaasResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in test-asaas function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

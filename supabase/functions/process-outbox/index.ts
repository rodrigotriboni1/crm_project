import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-outbox-worker-secret',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' })
  }

  try {
    const expected = Deno.env.get('OUTBOX_WORKER_SECRET') ?? ''
    const got = req.headers.get('x-outbox-worker-secret') ?? ''
    if (!expected || got !== expected) {
      return json(401, { ok: false, error: 'unauthorized' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: 'server_misconfigured' })
    }

    let batchSize = 25
    try {
      const body = (await req.json()) as { batch_size?: number }
      if (typeof body.batch_size === 'number' && Number.isFinite(body.batch_size)) {
        batchSize = Math.min(500, Math.max(1, Math.floor(body.batch_size)))
      }
    } catch {
      /* empty body ok */
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await admin.rpc('process_outbox_batch', { p_batch_size: batchSize })
    if (error) {
      console.error('process_outbox_batch', error)
      return json(500, { ok: false, error: error.message })
    }

    return json(200, { ok: true, result: data })
  } catch (e) {
    console.error(e)
    return json(500, { ok: false, error: 'internal_error' })
  }
})

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Máximo de pedidos por utilizador por janela (alinhado a `consume_openrouter_chat_rate`). */
const OPENROUTER_RATE_MAX = 30
const OPENROUTER_RATE_WINDOW_SEC = 3600

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: rateRaw, error: rateErr } = await supabase.rpc('consume_openrouter_chat_rate', {
      p_max: OPENROUTER_RATE_MAX,
      p_window_seconds: OPENROUTER_RATE_WINDOW_SEC,
    })
    if (rateErr) {
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const rate = rateRaw as { allowed?: boolean; retry_after_seconds?: number } | null
    if (!rate?.allowed) {
      const retry = Math.max(1, Math.min(86400, Number(rate?.retry_after_seconds) || 60))
      return new Response(JSON.stringify({ error: 'Too many requests; try again later.' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(retry),
        },
      })
    }

    const body = (await req.json()) as {
      messages?: { role: string; content: string }[]
      model?: string
    }
    const messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const model = body.model?.trim() || Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o-mini'

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': supabaseUrl,
        'X-Title': 'EmbalaFlow CRM',
      },
      body: JSON.stringify({ model, messages }),
    })

    if (!res.ok) {
      let detail = res.statusText
      try {
        const j = (await res.json()) as { error?: { message?: string }; message?: string }
        detail = j.error?.message ?? j.message ?? detail
      } catch {
        detail = await res.text()
      }
      return new Response(JSON.stringify({ error: detail || `OpenRouter ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Empty model response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ content: content.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

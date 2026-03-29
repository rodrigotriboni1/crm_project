import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export function getOpenRouterKey(): string | undefined {
  return import.meta.env.VITE_OPENROUTER_API_KEY?.trim() || undefined
}

export function getOpenRouterModel(): string {
  return import.meta.env.VITE_OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini'
}

/** Assistente disponível: chave no client (dev) ou sessão Supabase (Edge Function `openrouter-chat`). */
export function isAssistantConfigured(user: User | null): boolean {
  if (getOpenRouterKey()) return true
  return Boolean(supabase && user)
}

async function openrouterChatDirect(messages: ChatMessage[], model: string, key: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
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
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `OpenRouter ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Resposta vazia do modelo.')
  }
  return content.trim()
}

export async function openrouterChat(
  messages: ChatMessage[],
  opts?: { organizationId?: string }
): Promise<string> {
  const model = getOpenRouterModel()
  const viteKey = getOpenRouterKey()

  if (supabase) {
    const { data, error } = await supabase.functions.invoke<{ content?: string; error?: string }>(
      'openrouter-chat',
      { body: { messages, model, organizationId: opts?.organizationId } }
    )
    if (!error && data?.content && typeof data.content === 'string') {
      return data.content.trim()
    }
    if (viteKey) {
      return openrouterChatDirect(messages, model, viteKey)
    }
    const msg =
      data?.error ??
      error?.message ??
      'Deploy a função openrouter-chat e defina o segredo OPENROUTER_API_KEY no projeto, ou use VITE_OPENROUTER_API_KEY em desenvolvimento.'
    throw new Error(msg)
  }

  if (viteKey) {
    return openrouterChatDirect(messages, model, viteKey)
  }
  throw new Error('Configure Supabase ou VITE_OPENROUTER_API_KEY no .env do client.')
}

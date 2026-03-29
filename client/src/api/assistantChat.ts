import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AssistantChatMessage,
  AssistantChatThread,
  AssistantChatTurn,
} from '@/types/database'

const MAX_MESSAGES_PER_THREAD = 80

export function deriveThreadTitleFromMessage(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? text
  const t = line.trim().replace(/\s+/g, ' ')
  if (t.length <= 56) return t || 'Nova conversa'
  return `${t.slice(0, 53)}…`
}

export async function listAssistantThreads(
  sb: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<AssistantChatThread[]> {
  const { data, error } = await sb
    .from('assistant_chat_threads')
    .select('id, user_id, title, created_at, updated_at')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AssistantChatThread[]
}

export async function createAssistantThread(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  title = 'Nova conversa'
): Promise<AssistantChatThread> {
  const { data, error } = await sb
    .from('assistant_chat_threads')
    .insert({ user_id: userId, organization_id: organizationId, title })
    .select('id, user_id, title, created_at, updated_at')
    .single()
  if (error) throw error
  return data as AssistantChatThread
}

export async function updateAssistantThreadTitle(
  sb: SupabaseClient,
  threadId: string,
  title: string
): Promise<void> {
  const { error } = await sb.from('assistant_chat_threads').update({ title }).eq('id', threadId)
  if (error) throw error
}

export async function deleteAssistantThread(sb: SupabaseClient, threadId: string): Promise<void> {
  const { error } = await sb.from('assistant_chat_threads').delete().eq('id', threadId)
  if (error) throw error
}

export async function listAssistantChatMessages(
  sb: SupabaseClient,
  threadId: string,
  limit = MAX_MESSAGES_PER_THREAD
): Promise<AssistantChatTurn[]> {
  const { data, error } = await sb
    .from('assistant_chat_messages')
    .select('role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as Pick<AssistantChatMessage, 'role' | 'content'>[]
  return [...rows].reverse().map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content,
  }))
}

async function trimAssistantMessagesForThread(
  sb: SupabaseClient,
  threadId: string,
  max: number
): Promise<void> {
  const { data, error } = await sb
    .from('assistant_chat_messages')
    .select('id')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const ids = (data ?? []) as { id: string }[]
  if (ids.length <= max) return
  const overflow = ids.length - max
  const toDelete = ids.slice(0, overflow).map((r) => r.id)
  if (toDelete.length === 0) return
  const { error: delErr } = await sb.from('assistant_chat_messages').delete().in('id', toDelete)
  if (delErr) throw delErr
}

export async function appendAssistantExchange(
  sb: SupabaseClient,
  threadId: string,
  userContent: string,
  assistantContent: string
): Promise<void> {
  const { error } = await sb.from('assistant_chat_messages').insert([
    { thread_id: threadId, role: 'user' as const, content: userContent },
    { thread_id: threadId, role: 'assistant' as const, content: assistantContent },
  ])
  if (error) throw error
  await trimAssistantMessagesForThread(sb, threadId, MAX_MESSAGES_PER_THREAD)
}

export async function bulkInsertAssistantMessages(
  sb: SupabaseClient,
  threadId: string,
  turns: AssistantChatTurn[]
): Promise<void> {
  if (turns.length === 0) return
  const rows = turns.map((t) => ({
    thread_id: threadId,
    role: t.role,
    content: t.content,
  }))
  const { error } = await sb.from('assistant_chat_messages').insert(rows)
  if (error) throw error
  await trimAssistantMessagesForThread(sb, threadId, MAX_MESSAGES_PER_THREAD)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquarePlus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  appendAssistantExchange,
  bulkInsertAssistantMessages,
  createAssistantThread,
  deleteAssistantThread,
  deriveThreadTitleFromMessage,
  listAssistantChatMessages,
  listAssistantThreads,
  updateAssistantThreadTitle,
} from '@/api/assistantChat'
import { openrouterChat, isAssistantConfigured } from '@/api/openrouter'
import { useAuth } from '@/contexts/AuthContext'
import {
  clearAssistantTurns,
  loadAssistantTurns,
  saveAssistantTurns,
} from '@/lib/assistantChatHistory'
import type { AssistantStorageScope } from '@/lib/storageKeys'
import { assistantActiveThreadKey } from '@/lib/storageKeys'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { AssistantChatThread, AssistantChatTurn } from '@/types/database'

export type CrmAssistantPanelProps = {
  contextJson: string
  className?: string
  heading: string
  systemBase: string
  suggestions: readonly string[]
  emptyStateLead: string
  storageScope: AssistantStorageScope
}

type ChatTurn = AssistantChatTurn

function shortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

function localTurnsKey(userId: string, scope: AssistantStorageScope): string {
  if (scope === 'reports') return `${userId}_reports`
  if (scope === 'generic') return `${userId}_generic`
  return userId
}

export function CrmAssistantPanel({
  contextJson,
  className,
  heading,
  systemBase,
  suggestions,
  emptyStateLead,
  storageScope,
}: CrmAssistantPanelProps) {
  const { user } = useAuth()
  const [threads, setThreads] = useState<AssistantChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [threadsReady, setThreadsReady] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const configured = isAssistantConfigured(user)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const threadKey = user?.id ? assistantActiveThreadKey(user.id, storageScope) : ''

  const persistActiveThread = useCallback(
    (id: string) => {
      if (!user?.id) return
      try {
        localStorage.setItem(threadKey, id)
      } catch {
        /* ignore */
      }
    },
    [user?.id, threadKey]
  )

  useEffect(() => {
    if (!user?.id) {
      setThreads([])
      setActiveThreadId(null)
      setThreadsReady(false)
      setTurns([])
      return
    }

    if (!supabase) {
      setThreads([])
      setActiveThreadId(null)
      setThreadsReady(false)
      setBootstrapLoading(false)
      setTurns(loadAssistantTurns(localTurnsKey(user.id, storageScope)))
      return
    }

    let cancelled = false
    setBootstrapLoading(true)
    setThreadsReady(false)
    setActiveThreadId(null)
    void (async () => {
      try {
        setError(null)
        let list = await listAssistantThreads(supabase, user.id)
        if (list.length === 0) {
          const local = loadAssistantTurns(localTurnsKey(user.id, storageScope))
          if (local.length > 0) {
            const importTitle =
              storageScope === 'reports'
                ? 'Relatórios — importadas'
                : storageScope === 'generic'
                  ? 'Geral — importadas'
                  : 'Conversas importadas'
            const t = await createAssistantThread(supabase, user.id, importTitle)
            await bulkInsertAssistantMessages(supabase, t.id, local)
            clearAssistantTurns(localTurnsKey(user.id, storageScope))
            list = await listAssistantThreads(supabase, user.id)
          } else {
            const t = await createAssistantThread(supabase, user.id, 'Nova conversa')
            list = [t]
          }
        }
        let stored: string | null = null
        try {
          stored = localStorage.getItem(threadKey)
        } catch {
          stored = null
        }
        let pick =
          stored && list.some((x) => x.id === stored) ? stored : null
        if (pick == null) {
          if (storageScope === 'reports') {
            const rel = list.find((t) => t.title === 'Relatórios')
            if (rel) {
              pick = rel.id
            } else {
              const t = await createAssistantThread(supabase, user.id, 'Relatórios')
              list = [t, ...list]
              pick = t.id
            }
          } else if (storageScope === 'generic') {
            const rel = list.find((t) => t.title === 'Geral')
            if (rel) {
              pick = rel.id
            } else {
              const t = await createAssistantThread(supabase, user.id, 'Geral')
              list = [t, ...list]
              pick = t.id
            }
          } else {
            pick = list[0]?.id ?? null
          }
        }
        if (!cancelled && pick) {
          setThreads(list)
          setActiveThreadId(pick)
          persistActiveThread(pick)
          setThreadsReady(true)
        }
      } catch {
        if (!cancelled) {
          setThreads([])
          setActiveThreadId(null)
          setTurns(loadAssistantTurns(localTurnsKey(user.id, storageScope)))
          setThreadsReady(false)
          setError(
            'Não foi possível carregar conversas na nuvem. Aplique migrações (db push) ou use o modo local.'
          )
        }
      } finally {
        if (!cancelled) setBootstrapLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, persistActiveThread, storageScope, threadKey])

  useEffect(() => {
    if (!supabase || !user?.id || !activeThreadId || !threadsReady) return
    let cancelled = false
    setThreadLoading(true)
    void listAssistantChatMessages(supabase, activeThreadId)
      .then((msgs) => {
        if (!cancelled) setTurns(msgs)
      })
      .catch(() => {
        if (!cancelled) setTurns([])
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeThreadId, user?.id, threadsReady, supabase])

  useEffect(() => {
    if (!user?.id || !configured || supabase) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveAssistantTurns(localTurnsKey(user.id, storageScope), turns)
    }, 400)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [user?.id, configured, turns, supabase, storageScope])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, loading])

  const activeThread = threads.find((t) => t.id === activeThreadId)

  const handleNewThread = useCallback(async () => {
    if (!supabase || !user?.id) return
    setError(null)
    try {
      const t = await createAssistantThread(supabase, user.id, 'Nova conversa')
      setThreads((prev) => [t, ...prev])
      setActiveThreadId(t.id)
      persistActiveThread(t.id)
      setTurns([])
    } catch {
      setError('Não foi possível criar uma nova conversa.')
    }
  }, [user?.id, persistActiveThread])

  const handleSelectThread = useCallback(
    (id: string) => {
      setActiveThreadId(id)
      persistActiveThread(id)
      setError(null)
    },
    [persistActiveThread]
  )

  const handleDeleteThread = useCallback(
    async (e: React.MouseEvent, threadId: string) => {
      e.stopPropagation()
      if (!supabase || !user?.id) return
      setError(null)
      try {
        await deleteAssistantThread(supabase, threadId)
        const next = threads.filter((t) => t.id !== threadId)
        if (next.length === 0) {
          const t = await createAssistantThread(supabase, user.id, 'Nova conversa')
          setThreads([t])
          setActiveThreadId(t.id)
          persistActiveThread(t.id)
        } else {
          setThreads(next)
          if (activeThreadId === threadId) {
            const pick = next[0]!.id
            setActiveThreadId(pick)
            persistActiveThread(pick)
          }
        }
      } catch {
        setError('Não foi possível apagar a conversa.')
      }
    },
    [supabase, user?.id, threads, activeThreadId, persistActiveThread]
  )

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || !configured || !user?.id) return
      if (supabase && !activeThreadId) return
      setError(null)
      setInput('')
      const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: trimmed }]
      setTurns(nextTurns)
      setLoading(true)
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `${systemBase}\n\n--- Dados atuais (JSON) ---\n${contextJson}`,
          },
          ...nextTurns,
        ]
        const reply = await openrouterChat(messages)
        setTurns((prev) => [...prev, { role: 'assistant', content: reply }])
        if (supabase && activeThreadId) {
          try {
            await appendAssistantExchange(supabase, activeThreadId, trimmed, reply)
            const current = threads.find((t) => t.id === activeThreadId)
            if (current?.title === 'Nova conversa') {
              const newTitle = deriveThreadTitleFromMessage(trimmed)
              await updateAssistantThreadTitle(supabase, activeThreadId, newTitle)
              setThreads((prev) =>
                prev.map((t) => (t.id === activeThreadId ? { ...t, title: newTitle } : t))
              )
            }
            setThreads((prev) => {
              const hit = prev.find((t) => t.id === activeThreadId)
              if (!hit) return prev
              const rest = prev.filter((t) => t.id !== activeThreadId)
              return [{ ...hit, updated_at: new Date().toISOString() }, ...rest]
            })
          } catch (persistErr) {
            console.error(persistErr)
            setError(
              'Resposta recebida, mas não foi guardada na nuvem. Verifique migrações e permissões.'
            )
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setTurns((prev) => prev.slice(0, -1))
        setInput(trimmed)
      } finally {
        setLoading(false)
      }
    },
    [
      contextJson,
      systemBase,
      configured,
      loading,
      turns,
      user?.id,
      supabase,
      activeThreadId,
      threads,
    ]
  )

  const cloudUi = Boolean(supabase && user?.id && threadsReady)

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col border border-border bg-card', className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-dark">{heading}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {configured
              ? supabase
                ? activeThread?.title ?? 'Conversas'
                : 'Histórico neste navegador'
              : 'Faça login ou configure a API'}
          </p>
        </div>
      </div>

      {!configured ? (
        <div className="flex-1 space-y-2 p-4 text-sm text-muted-foreground">
          <p>
            Com sessão ativa, o app chama a Edge Function{' '}
            <code className="rounded bg-muted px-1 text-xs">openrouter-chat</code>{' '}
            (segredo <code className="rounded bg-muted px-1 text-xs">OPENROUTER_API_KEY</code> no
            Supabase).
          </p>
          <p className="text-[11px]">
            Em desenvolvimento local, pode usar no <code className="text-xs">client/.env</code>:
          </p>
          <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 text-[11px]">
            VITE_OPENROUTER_API_KEY=sk-or-...
            {'\n'}
            VITE_OPENROUTER_MODEL=openai/gpt-4o-mini
          </pre>
          <p className="text-[11px]">
            A chave <code className="text-xs">VITE_*</code> vai no bundle; prefira a função em
            produção.
          </p>
        </div>
      ) : (
        <div className={cn('flex min-h-0 flex-1 flex-col', cloudUi && 'sm:flex-row')}>
          {cloudUi && (
            <aside className="flex max-h-[140px] shrink-0 flex-col gap-1.5 border-b border-border p-2 sm:max-h-none sm:w-[148px] sm:border-b-0 sm:border-r sm:py-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-full justify-start gap-1.5 px-2 text-[11px] font-medium"
                onClick={() => void handleNewThread()}
                disabled={bootstrapLoading}
              >
                <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                Nova conversa
              </Button>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {threads.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'group relative flex w-full items-start gap-1 rounded-md border px-2 py-1.5 text-left transition-colors',
                      t.id === activeThreadId
                        ? 'border-brand-orange/60 bg-brand-orange/10'
                        : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleSelectThread(t.id)}
                    >
                      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-brand-dark">
                        {t.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {shortDate(t.updated_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                      title="Apagar conversa"
                      onClick={(e) => void handleDeleteThread(e, t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {(bootstrapLoading || threadLoading) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A carregar…
                </div>
              )}
              {!bootstrapLoading && !threadLoading && turns.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{emptyStateLead}</p>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={loading || bootstrapLoading || threadLoading}
                        onClick={() => void send(s)}
                        className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {turns.map((t, i) => (
                <div
                  key={`${i}-${t.role}-${t.content.slice(0, 12)}`}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    t.role === 'user'
                      ? 'ml-4 bg-brand-orange/10 text-brand-dark'
                      : 'mr-2 border border-border bg-brand-surface/50 text-muted-foreground'
                  )}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.role === 'user' ? 'Você' : 'Assistente'}
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed">{t.content}</div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando resposta…
                </div>
              )}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border p-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua pergunta…"
                rows={2}
                disabled={loading || bootstrapLoading || threadLoading}
                className="mb-2 !h-[4.5rem] !min-h-[4.5rem] !max-h-[6rem] text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(input)
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="w-full gap-2"
                disabled={loading || bootstrapLoading || threadLoading || !input.trim()}
                onClick={() => void send(input)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

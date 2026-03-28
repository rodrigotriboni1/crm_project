import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { openrouterChat, getOpenRouterKey } from '@/api/openrouter'
import { cn } from '@/lib/utils'

const SYSTEM_BASE = `Você é o assistente do EmbalaFlow, CRM para empresa de embalagens.
Você recebe um snapshot JSON com métricas, fila de follow-up e últimas interações.
Regras:
- Responda em português do Brasil, objetivo e profissional.
- Use apenas os dados do snapshot; não invente clientes, valores, datas ou status.
- Se algo não constar no JSON, diga claramente que não aparece no painel.
- Você não executa ações no sistema (não altera banco nem envia mensagens). Pode sugerir textos de WhatsApp/e-mail como rascunho.
- Valores monetários no JSON estão em reais (número); formate em BRL quando citar.`

const SUGGESTIONS = [
  'Quem devo priorizar hoje?',
  'Resuma o funil e o risco de follow-up.',
  'Sugira um texto curto de WhatsApp para o primeiro da fila.',
]

type ChatTurn = { role: 'user' | 'assistant'; content: string }

type Props = {
  contextJson: string
  className?: string
}

export default function DashboardAssistant({ contextJson, className }: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const configured = Boolean(getOpenRouterKey())

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, loading])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || !configured) return
      setError(null)
      setInput('')
      const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: trimmed }]
      setTurns(nextTurns)
      setLoading(true)
      try {
        const messages = [
          { role: 'system' as const, content: `${SYSTEM_BASE}\n\n--- Dados atuais (JSON) ---\n${contextJson}` },
          ...nextTurns,
        ]
        const reply = await openrouterChat(messages)
        setTurns((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setTurns((prev) => prev.slice(0, -1))
        setInput(trimmed)
      } finally {
        setLoading(false)
      }
    },
    [contextJson, configured, loading, turns]
  )

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col border-[#d4d2c8] bg-white', className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-[#d4d2c8] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-dark">Assistente</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {configured ? 'OpenRouter · dados do painel' : 'Configure a chave da API'}
          </p>
        </div>
        {configured && turns.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-[11px]" onClick={() => { setTurns([]); setError(null) }}>
            Limpar
          </Button>
        )}
      </div>

      {!configured ? (
        <div className="flex-1 space-y-2 p-4 text-sm text-muted-foreground">
          <p>Adicione ao <code className="rounded bg-muted px-1 text-xs">client/.env</code>:</p>
          <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 text-[11px]">
            VITE_OPENROUTER_API_KEY=sk-or-...
            {'\n'}
            VITE_OPENROUTER_MODEL=openai/gpt-4o-mini
          </pre>
          <p className="text-[11px]">
            A chave fica no bundle do navegador. Para produção, use um backend proxy.
          </p>
        </div>
      ) : (
        <>
          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pergunte com base nos dados do dashboard. Sugestões:
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={loading}
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
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  t.role === 'user'
                    ? 'ml-4 bg-brand-orange/10 text-brand-dark'
                    : 'mr-2 border border-[#d4d2c8] bg-brand-light/40 text-[#3d3c38]'
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

          <div className="shrink-0 border-t border-[#d4d2c8] p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua pergunta…"
              rows={2}
              disabled={loading}
              className="mb-2 !h-[4.5rem] !min-h-[4.5rem] !max-h-[6rem] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
            />
            <Button type="button" size="sm" className="w-full gap-2" disabled={loading || !input.trim()} onClick={() => void send(input)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** OpenRouter API key (exposto no bundle; em produção prefira proxy no backend). */
  readonly VITE_OPENROUTER_API_KEY?: string
  /** Ex.: openai/gpt-4o-mini — ver https://openrouter.ai/models */
  readonly VITE_OPENROUTER_MODEL?: string
  /** URL externa (Typeform, site, etc.) para “novo orçamento”; opcional. */
  readonly VITE_NOVO_ORCAMENTO_EXTERNAL_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

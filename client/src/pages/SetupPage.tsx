export default function SetupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-light lg:flex-row">
      <div className="flex flex-1 flex-col justify-center border-b border-[#d4d2c8] bg-brand-dark px-8 py-12 text-brand-light lg:border-b-0 lg:border-r lg:py-16 lg:pl-14 lg:pr-10">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-brand-orange">EmbalaFlow</p>
        <h1 className="mt-4 max-w-md font-sans text-2xl font-semibold tracking-tight md:text-3xl">
          Configure o Supabase para ativar o CRM.
        </h1>
        <p className="mt-4 max-w-md font-serif text-sm leading-relaxed text-brand-mid">
          Sem variáveis de ambiente, a app fica nesta tela — é o comportamento esperado até concluir o setup.
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-12">
        <div className="mx-auto max-w-md space-y-6">
          <ol className="list-decimal space-y-4 pl-5 font-serif text-sm leading-relaxed text-[#3d3c38]">
            <li>
              Crie um projeto em{' '}
              <a
                className="font-sans font-medium text-brand-blue underline-offset-2 hover:underline"
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                supabase.com
              </a>
              .
            </li>
            <li>
              Execute o SQL em{' '}
              <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-xs text-brand-dark">
                supabase/migrations/
              </code>{' '}
              (ou use <span className="font-mono text-xs">supabase db push</span>).
            </li>
            <li>
              Copie{' '}
              <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-xs text-brand-dark">
                client/.env.example
              </code>{' '}
              para{' '}
              <code className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-xs text-brand-dark">
                client/.env
              </code>{' '}
              com URL e chave anon.
            </li>
          </ol>
          <p className="border-t border-[#d4d2c8] pt-6 font-serif text-xs text-brand-mid">
            Protótipo estático legado: <code className="font-mono text-brand-dark">crm-embalagens-react.html</code>{' '}
            (sem dados reais).
          </p>
        </div>
      </div>
    </div>
  )
}

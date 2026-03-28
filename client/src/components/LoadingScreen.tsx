type Props = { message?: string }

export default function LoadingScreen({ message = 'Carregando…' }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-light px-4">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-brand-surface border-t-brand-orange"
        aria-hidden
      />
      <p className="font-serif text-sm text-brand-mid">{message}</p>
    </div>
  )
}

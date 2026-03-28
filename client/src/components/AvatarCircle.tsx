import { cn, initialsFromName, colorFromName, AVATAR_COLOR_CLASSES } from '@/lib/utils'

type Props = {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export default function AvatarCircle({ name, size = 'sm', className }: Props) {
  const color = colorFromName(name)
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-sans font-semibold',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
        AVATAR_COLOR_CLASSES[color],
        className
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  )
}

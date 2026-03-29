import * as React from 'react'
import { cn } from '@/lib/utils'

/** Alinhado a `Input`: altura, padding, fundo, focus ring e seta custom (sem aparência nativa). */
export const selectNativeClass =
  'flex h-10 w-full cursor-pointer appearance-none rounded-md border border-border bg-card py-2 pl-3 pr-9 text-sm text-brand-dark ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 bg-[length:1rem] bg-[position:right_0.65rem_center] bg-no-repeat [background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 viewBox=%270 0 24 24%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] dark:[background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 viewBox=%270 0 24 24%27%3E%3Cpath stroke=%27%23a8a69e%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")]'

export const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(selectNativeClass, className)} {...props} />
))
SelectNative.displayName = 'SelectNative'

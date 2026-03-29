import * as React from 'react'
import { cn } from '@/lib/utils'

export const selectNativeClass =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50'

export const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(selectNativeClass, className)} {...props} />
))
SelectNative.displayName = 'SelectNative'

import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex h-[7.5rem] min-h-[7.5rem] max-h-[7.5rem] w-full resize-none overflow-y-auto rounded-md border border-[#d4d2c8] bg-white px-3 py-2 text-sm text-brand-dark [field-sizing:fixed] placeholder:text-brand-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

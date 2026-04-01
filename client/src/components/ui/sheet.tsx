import * as React from 'react'
import type { HTMLAttributes } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetPortal = DialogPrimitive.Portal

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40 dark:bg-black/55', className)}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetContentVariants = cva(
  'fixed z-50 flex flex-col gap-4 border border-border bg-card shadow-lg duration-200',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-[min(100vw-1rem,28rem)] border-l sm:max-w-lg',
        left: 'inset-y-0 left-0 h-full w-[min(100vw-1rem,28rem)] border-r sm:max-w-lg',
      },
    },
    defaultVariants: { side: 'right' },
  }
)

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side, className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetContentVariants({ side }), 'overflow-y-auto p-4 sm:p-6', className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

export const SheetHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 pr-8 text-left', className)} {...props} />
)

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-heading text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

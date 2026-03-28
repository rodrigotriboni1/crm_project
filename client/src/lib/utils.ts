import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Two-letter initials from a person or company name */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AvatarColor = 'blue' | 'green' | 'orange'

/** Deterministic color for an avatar based on the name string */
export function colorFromName(name: string): AvatarColor {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const colors: AvatarColor[] = ['blue', 'green', 'orange']
  return colors[sum % colors.length]
}

export const AVATAR_COLOR_CLASSES: Record<AvatarColor, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
}

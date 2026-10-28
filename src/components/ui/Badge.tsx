import { cn } from '@/lib/utils'

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'accent' | 'orange' | 'earth'

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  const variants: Record<Variant, string> = {
    green:  'badge-green',
    yellow: 'badge-yellow',
    red:    'badge-red',
    blue:   'badge-blue',
    gray:   'badge-gray',
    accent: 'badge-accent',
    orange: 'badge-orange',
    earth:  'badge-earth',
  }
  return <span className={cn(variants[variant], className)}>{children}</span>
}

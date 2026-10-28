import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: number
  suffix?: string
  className?: string
}

export default function StatCard({ label, value, icon: Icon, iconBg = 'bg-primary-100', iconColor = 'text-primary-600', trend, suffix, className }: Props) {
  return (
    <div className={cn('stat-card', className)}>
      <div className={cn('stat-icon', iconBg)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">
          {value}{suffix && <span className="text-base font-normal text-gray-500 ml-1">{suffix}</span>}
        </p>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium mt-1', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  )
}

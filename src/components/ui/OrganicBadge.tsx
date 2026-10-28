import { CheckCircle, Clock, AlertCircle, XCircle, Leaf } from 'lucide-react'
import type { OrganicStatus } from '@/types/database'
import { ORGANIC_LABELS } from '@/lib/utils'

interface Props { status: OrganicStatus; compact?: boolean }

const ICONS: Record<string, React.ElementType> = {
  certified_organic:       CheckCircle,
  certification_pending:   Clock,
  farmer_declared_organic: Leaf,
  conventional:            XCircle,
  not_disclosed:           AlertCircle,
}
const COLOR_MAP: Record<string, string> = {
  green:  'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  gray:   'bg-gray-50 text-gray-600 border-gray-200',
}

export default function OrganicBadge({ status, compact = false }: Props) {
  const config = ORGANIC_LABELS[status] ?? ORGANIC_LABELS['not_disclosed']
  const Icon   = ICONS[status] ?? AlertCircle
  const color  = COLOR_MAP[config.color] ?? COLOR_MAP['gray']
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {!compact && config.label}
    </span>
  )
}

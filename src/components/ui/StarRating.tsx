import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  rating: number
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
  count?: number
}

export default function StarRating({ rating, maxStars = 5, size = 'sm', showNumber = false, count }: Props) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxStars }, (_, i) => (
          <Star key={i} className={cn(sizes[size], i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')} />
        ))}
      </div>
      {showNumber && (
        <span className="text-xs font-medium text-gray-600">
          {rating.toFixed(1)}{count !== undefined && <span className="text-gray-400 ml-0.5">({count})</span>}
        </span>
      )}
    </div>
  )
}

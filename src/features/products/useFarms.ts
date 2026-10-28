import { useEffect, useState } from 'react'
import { DEMO_FARMS } from '@/lib/demo-data'
import { IS_DEMO_MODE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Farm } from '@/types/database'

export function useFarms() {
  const [farms, setFarms] = useState<Farm[]>(IS_DEMO_MODE ? DEMO_FARMS : [])
  const [isLoading, setIsLoading] = useState(!IS_DEMO_MODE)
  const [error, setError] = useState('')

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let active = true
    const load = async () => {
      if (!supabase) return
      const { data, error: queryError } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
      if (queryError) throw new Error(`Unable to load farms: ${queryError.message}`)
      if (active) setFarms(data as Farm[])
    }
    void load()
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load farms.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  return { farms, isLoading, error }
}

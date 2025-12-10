import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeSubscription(
  tables: string[],
  onUpdate: () => void
) {
  useEffect(() => {
    const channels: RealtimeChannel[] = []

    tables.forEach((table) => {
      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          () => {
            onUpdate()
          }
        )
        .subscribe()

      channels.push(channel)
    })

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [tables.join(','), onUpdate])
}

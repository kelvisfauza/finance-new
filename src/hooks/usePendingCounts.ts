import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface PendingCounts {
  expenses: number
  requisitions: number
  hrPayments: number
}

export const usePendingCounts = () => {
  const [counts, setCounts] = useState<PendingCounts>({
    expenses: 0,
    requisitions: 0,
    hrPayments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCounts()

    const subscription = supabase
      .channel('pending_counts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_requests' },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('request_type, finance_approved')
        .eq('status', 'Pending')
        .eq('finance_approved', false)

      if (error) throw error

      const expenseCount = data?.filter((r: any) => r.request_type === 'expense').length || 0
      const requisitionCount = data?.filter((r: any) => r.request_type === 'requisition').length || 0
      const hrCount = data?.filter((r: any) => r.request_type === 'salary' || r.request_type === 'wage').length || 0

      setCounts({
        expenses: expenseCount,
        requisitions: requisitionCount,
        hrPayments: hrCount
      })
    } catch (error) {
      console.error('Error fetching pending counts:', error)
    } finally {
      setLoading(false)
    }
  }

  return { counts, loading }
}

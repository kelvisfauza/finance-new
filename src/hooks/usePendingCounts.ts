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
        .select('type, admin_approved, finance_approved, status')
        .eq('admin_approved', true)
        .eq('finance_approved', false)
        .in('status', ['Pending Finance', 'Pending'])

      if (error) throw error

      const expenseCount = data?.filter((r: any) =>
        ['Expense Request', 'Company Expense', 'Field Financing Request', 'Personal Expense'].includes(r.type)
      ).length || 0

      const requisitionCount = data?.filter((r: any) =>
        ['Requisition', 'Cash Requisition'].includes(r.type)
      ).length || 0

      const hrCount = data?.filter((r: any) =>
        ['Salary Request', 'Wage Request'].includes(r.type)
      ).length || 0

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

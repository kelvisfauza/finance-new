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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'money_requests' },
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
      // Count from approval_requests table
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .select('type, admin_approved, finance_approved, status')
        .eq('admin_approved', true)
        .eq('finance_approved', false)
        .in('status', ['Pending Finance', 'Pending'])

      if (approvalError) throw approvalError

      // Count from money_requests table (old HR system)
      const { data: moneyData, error: moneyError } = await supabase
        .from('money_requests')
        .select('id')
        .eq('admin_approved', true)
        .eq('finance_approved', false)
        .in('status', ['approved', 'Approved', 'Pending Finance', 'pending'])

      if (moneyError) throw moneyError

      const expenseCount = approvalData?.filter((r: any) =>
        ['Expense Request', 'Company Expense', 'Field Financing Request', 'Personal Expense'].includes(r.type)
      ).length || 0

      const requisitionCount = approvalData?.filter((r: any) =>
        ['Requisition', 'Cash Requisition'].includes(r.type)
      ).length || 0

      const hrCountFromApprovals = approvalData?.filter((r: any) =>
        ['Salary Request', 'Wage Request', 'Employee Salary Request', 'Salary Advance'].includes(r.type)
      ).length || 0

      const hrCountFromMoney = moneyData?.length || 0

      setCounts({
        expenses: expenseCount,
        requisitions: requisitionCount,
        hrPayments: hrCountFromApprovals + hrCountFromMoney
      })
    } catch (error) {
      console.error('Error fetching pending counts:', error)
    } finally {
      setLoading(false)
    }
  }

  return { counts, loading }
}

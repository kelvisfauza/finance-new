import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface PendingCounts {
  expenses: number
  requisitions: number
  hrPayments: number
  adminFinalApprovals: number
}

export const usePendingCounts = () => {
  const [counts, setCounts] = useState<PendingCounts>({
    expenses: 0,
    requisitions: 0,
    hrPayments: 0,
    adminFinalApprovals: 0
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
      // NEW FLOW: Count requests pending FINANCE approval (not admin)
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .select('type, finance_reviewed, admin_final_approval, status')
        .eq('finance_reviewed', false)
        .in('status', ['Pending Finance', 'Pending'])

      if (approvalError) throw approvalError

      // Count from money_requests table (old HR system) - pending finance
      const { data: moneyData, error: moneyError } = await supabase
        .from('money_requests')
        .select('id')
        .neq('request_type', 'Mid-Month Salary')
        .eq('finance_reviewed', false)
        .in('status', ['Pending Finance', 'Pending', 'pending'])

      if (moneyError) throw moneyError

      // NEW: Count requests pending ADMIN FINAL approval (already finance reviewed)
      const { data: adminApprovalData, error: adminApprovalError } = await supabase
        .from('approval_requests')
        .select('id')
        .eq('finance_reviewed', true)
        .eq('admin_final_approval', false)
        .eq('status', 'Finance Approved')

      if (adminApprovalError) throw adminApprovalError

      const { data: adminMoneyData, error: adminMoneyError } = await supabase
        .from('money_requests')
        .select('id')
        .eq('finance_reviewed', true)
        .eq('admin_final_approval', false)
        .eq('status', 'Finance Approved')

      if (adminMoneyError) throw adminMoneyError

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

      const adminFinalApprovalsCount = (adminApprovalData?.length || 0) + (adminMoneyData?.length || 0)

      setCounts({
        expenses: expenseCount,
        requisitions: requisitionCount,
        hrPayments: hrCountFromApprovals + hrCountFromMoney,
        adminFinalApprovals: adminFinalApprovalsCount
      })
    } catch (error) {
      console.error('Error fetching pending counts:', error)
    } finally {
      setLoading(false)
    }
  }

  return { counts, loading }
}

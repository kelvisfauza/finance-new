import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface PendingCommitments {
  pendingCoffeePayments: number
  pendingExpenses: number
  totalCommitted: number
  loading: boolean
  error: string | null
}

export const usePendingCommitments = () => {
  const [commitments, setCommitments] = useState<PendingCommitments>({
    pendingCoffeePayments: 0,
    pendingExpenses: 0,
    totalCommitted: 0,
    loading: true,
    error: null
  })

  const fetchCommitments = async () => {
    try {
      const [paymentRecordsResult, expenseRequestsResult] = await Promise.all([
        supabase
          .from('payment_records')
          .select('id, amount, balance')
          .eq('status', 'Pending'),

        supabase
          .from('approval_requests')
          .select('amount')
          .eq('finance_approved', true)
          .eq('status', 'Pending Admin Approval')
      ])

      if (paymentRecordsResult.error) throw paymentRecordsResult.error
      if (expenseRequestsResult.error) throw expenseRequestsResult.error

      const pendingCoffeePayments = paymentRecordsResult.data?.reduce(
        (sum: number, record: any) => sum + (Number(record.balance) || Number(record.amount) || 0),
        0
      ) || 0

      const pendingExpenses = expenseRequestsResult.data?.reduce(
        (sum: number, request: any) => sum + (Number(request.amount) || 0),
        0
      ) || 0

      const totalCommitted = pendingCoffeePayments + pendingExpenses

      setCommitments({
        pendingCoffeePayments,
        pendingExpenses,
        totalCommitted,
        loading: false,
        error: null
      })
    } catch (error: any) {
      console.error('Error fetching pending commitments:', error)
      setCommitments((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch pending commitments'
      }))
    }
  }

  useEffect(() => {
    fetchCommitments()
  }, [])

  return { ...commitments, refetch: fetchCommitments }
}

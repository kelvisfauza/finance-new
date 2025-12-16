import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface FinanceStats {
  pendingCoffeePayments: number
  pendingCoffeeAmount: number
  availableCash: number
  advanceAmount: number
  netCash: number
  pendingExpenseRequests: number
  pendingExpenseAmount: number
  completedToday: number
  completedTodayAmount: number
  loading: boolean
  error: string | null
}

export const useFinanceStats = () => {
  const [stats, setStats] = useState<FinanceStats>({
    pendingCoffeePayments: 0,
    pendingCoffeeAmount: 0,
    availableCash: 0,
    advanceAmount: 0,
    netCash: 0,
    pendingExpenseRequests: 0,
    pendingExpenseAmount: 0,
    completedToday: 0,
    completedTodayAmount: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const [
        coffeeRecords,
        cashBalance,
        cashTransactions,
        advances,
        expenseApprovals,
        todayTransactions
      ] = await Promise.all([
        supabase
          .from('coffee_records')
          .select('batch_number')
          .eq('status', 'submitted_to_finance'),

        supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .single(),

        supabase
          .from('finance_cash_transactions')
          .select('transaction_type, amount, status'),

        supabase
          .from('finance_advances')
          .select('amount')
          .eq('status', 'Pending'),

        supabase
          .from('approval_requests')
          .select('amount, type')
          .eq('admin_approved', true)
          .eq('finance_approved', false)
          .in('status', ['Pending Finance', 'Pending'])
          .in('type', ['Expense Request', 'Company Expense', 'Field Financing Request', 'Personal Expense']),

        supabase
          .from('finance_transactions')
          .select('amount')
          .gte('date', today)
      ])

      let netBalance = 0

      if (cashBalance.data?.current_balance !== undefined) {
        netBalance = Number(cashBalance.data.current_balance)
      } else if (cashTransactions.data) {
        const totalCashIn = cashTransactions.data
          .filter((t: any) => ['DEPOSIT', 'ADVANCE_RECOVERY'].includes(t.transaction_type) && t.status === 'confirmed')
          .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

        const totalCashOut = cashTransactions.data
          .filter((t: any) => ['PAYMENT', 'EXPENSE'].includes(t.transaction_type) && t.status === 'confirmed')
          .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

        netBalance = totalCashIn - totalCashOut
      }

      const availableCash = Math.max(0, netBalance)
      const advanceAmount = netBalance < 0 ? Math.abs(netBalance) : 0

      let pendingCoffeeAmount = 0
      let coffeeLotsCount = 0

      if (coffeeRecords.data && coffeeRecords.data.length > 0) {
        const batchNumbers = coffeeRecords.data.map((r: any) => r.batch_number)
        const { data: assessments } = await supabase
          .from('quality_assessments')
          .select('batch_number, final_price')
          .in('batch_number', batchNumbers)

        if (assessments) {
          coffeeLotsCount = assessments.length
          pendingCoffeeAmount = assessments.reduce((sum: number, item: any) => sum + Number(item.final_price || 0), 0)
        }
      }

      const pendingExpenseAmount = expenseApprovals.data?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0
      const completedTodayAmount = todayTransactions.data?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0

      setStats({
        pendingCoffeePayments: coffeeLotsCount,
        pendingCoffeeAmount,
        availableCash,
        advanceAmount,
        netCash: netBalance,
        pendingExpenseRequests: expenseApprovals.data?.length || 0,
        pendingExpenseAmount,
        completedToday: todayTransactions.data?.length || 0,
        completedTodayAmount,
        loading: false,
        error: null
      })
    } catch (error: any) {
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch finance stats'
      }))
    }
  }

  return { ...stats, refetch: fetchStats }
}

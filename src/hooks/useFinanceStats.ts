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
        coffeePayments,
        cashBalance,
        advances,
        expenseRequests,
        todayTransactions
      ] = await Promise.all([
        supabase
          .from('finance_coffee_lots')
          .select('amount')
          .eq('finance_status', 'pending'),

        supabase
          .from('finance_cash_balance')
          .select('balance')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('finance_advances')
          .select('amount, recovered_amount'),

        supabase
          .from('approval_requests')
          .select('amount')
          .eq('type', 'Expense Request')
          .eq('status', 'Pending'),

        supabase
          .from('finance_transactions')
          .select('amount')
          .gte('created_at', today)
          .eq('status', 'Completed')
      ])

      const pendingCoffeeAmount = coffeePayments.data?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0
      const availableCash = Number(cashBalance.data?.balance || 0)
      const advanceAmount = advances.data?.reduce((sum: number, item: any) =>
        sum + (Number(item.amount) - Number(item.recovered_amount || 0)), 0
      ) || 0
      const pendingExpenseAmount = expenseRequests.data?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0
      const completedTodayAmount = todayTransactions.data?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0

      setStats({
        pendingCoffeePayments: coffeePayments.data?.length || 0,
        pendingCoffeeAmount,
        availableCash,
        advanceAmount,
        netCash: availableCash - advanceAmount,
        pendingExpenseRequests: expenseRequests.data?.length || 0,
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

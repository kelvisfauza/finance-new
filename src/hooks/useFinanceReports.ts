import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ReportFilters } from '../components/reports/ReportFilters'

export interface FinanceStats {
  totalExpenses: number
  totalHRSalary: number
  totalRequisitions: number
}

export interface MonthlyData {
  month: string
  expenses: number
  hrSalary: number
  requisitions: number
}

export const useFinanceReports = (filters: ReportFilters) => {
  const [stats, setStats] = useState<FinanceStats>({
    totalExpenses: 0,
    totalHRSalary: 0,
    totalRequisitions: 0
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReportData()
  }, [filters])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('approval_requests')
        .select('type, amount, finance_approved_at, department, status, daterequested')
        .not('finance_approved_at', 'is', null)

      if (filters.dateFrom) {
        query = query.gte('finance_approved_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('finance_approved_at', filters.dateTo)
      }
      if (filters.department) {
        query = query.eq('department', filters.department)
      }
      if (filters.status !== 'All') {
        if (filters.status === 'Approved') {
          query = query.eq('status', 'Approved')
        } else if (filters.status === 'Pending') {
          query = query.eq('status', 'Pending')
        } else if (filters.status === 'Rejected') {
          query = query.eq('status', 'Rejected')
        }
      }

      const { data: approvalData, error: approvalError } = await query

      if (approvalError) throw approvalError

      let expenseQuery = supabase
        .from('finance_expenses')
        .select('amount, date, category, status')

      if (filters.dateFrom) {
        expenseQuery = expenseQuery.gte('date', filters.dateFrom)
      }
      if (filters.dateTo) {
        expenseQuery = expenseQuery.lte('date', filters.dateTo)
      }

      const { data: expenseData, error: expenseError } = await expenseQuery

      if (expenseError) throw expenseError

      let totalExpenses = 0
      let totalHRSalary = 0
      let totalRequisitions = 0

      approvalData?.forEach((item: any) => {
        const amount = Number(item.amount) || 0

        if (item.type === 'requisition' || item.type === 'Requisition') {
          totalRequisitions += amount
        } else if (
          item.type === 'salary' ||
          item.type === 'wage' ||
          item.type === 'Employee Salary Request' ||
          item.type === 'Salary Payment'
        ) {
          totalHRSalary += amount
        } else if (
          item.type === 'expense' ||
          item.type === 'Expense Request' ||
          item.type?.toLowerCase().includes('expense')
        ) {
          totalExpenses += amount
        }
      })

      expenseData?.forEach((item: any) => {
        totalExpenses += Number(item.amount) || 0
      })

      setStats({
        totalExpenses,
        totalHRSalary,
        totalRequisitions
      })

      const monthlyMap = new Map<string, MonthlyData>()

      approvalData?.forEach((item: any) => {
        const date = item.finance_approved_at || item.daterequested
        if (!date) return

        const monthKey = date.substring(0, 7)
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthKey, expenses: 0, hrSalary: 0, requisitions: 0 })
        }

        const monthData = monthlyMap.get(monthKey)!
        const amount = Number(item.amount) || 0

        if (item.type === 'requisition' || item.type === 'Requisition') {
          monthData.requisitions += amount
        } else if (
          item.type === 'salary' ||
          item.type === 'wage' ||
          item.type === 'Employee Salary Request' ||
          item.type === 'Salary Payment'
        ) {
          monthData.hrSalary += amount
        } else if (
          item.type === 'expense' ||
          item.type === 'Expense Request' ||
          item.type?.toLowerCase().includes('expense')
        ) {
          monthData.expenses += amount
        }
      })

      expenseData?.forEach((item: any) => {
        const monthKey = item.date.substring(0, 7)
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthKey, expenses: 0, hrSalary: 0, requisitions: 0 })
        }
        monthlyMap.get(monthKey)!.expenses += Number(item.amount) || 0
      })

      const sortedMonthly = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12)

      setMonthlyData(sortedMonthly)
    } catch (error) {
      console.error('Error fetching finance reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return { stats, monthlyData, loading }
}

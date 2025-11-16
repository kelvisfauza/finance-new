import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ReportFilters } from './ReportFilters'
import { formatCurrency } from '../../lib/utils'
import { format } from 'date-fns'
import { TrendingUp, XCircle } from 'lucide-react'

interface ExpenseRecord {
  id: string
  date: string
  category: string
  description: string
  department: string
  amount: number
  status: string
  financeApprovedBy?: string
  financeApprovedAt?: string
  source: 'finance_expenses' | 'approval_requests'
}

interface ExpensesTabProps {
  filters: ReportFilters
}

export const ExpensesTab = ({ filters }: ExpensesTabProps) => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, count: 0, rejected: 0 })

  useEffect(() => {
    fetchExpenses()
  }, [filters])

  const fetchExpenses = async () => {
    try {
      setLoading(true)

      let approvalQuery = supabase
        .from('approval_requests')
        .select('*')
        .not('finance_approved_at', 'is', null)

      if (filters.dateFrom) {
        approvalQuery = approvalQuery.gte('finance_approved_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        approvalQuery = approvalQuery.lte('finance_approved_at', filters.dateTo)
      }
      if (filters.department) {
        approvalQuery = approvalQuery.eq('department', filters.department)
      }
      if (filters.status !== 'All') {
        approvalQuery = approvalQuery.eq('status', filters.status)
      }

      const { data: approvalData, error: approvalError } = await approvalQuery

      if (approvalError) throw approvalError

      let expenseQuery = supabase
        .from('finance_expenses')
        .select('*')

      if (filters.dateFrom) {
        expenseQuery = expenseQuery.gte('date', filters.dateFrom)
      }
      if (filters.dateTo) {
        expenseQuery = expenseQuery.lte('date', filters.dateTo)
      }

      const { data: expenseData, error: expenseError } = await expenseQuery

      if (expenseError) throw expenseError

      const combinedExpenses: ExpenseRecord[] = []

      expenseData?.forEach((exp: any) => {
        combinedExpenses.push({
          id: exp.id,
          date: exp.date,
          category: exp.category || 'N/A',
          description: exp.description,
          department: 'N/A',
          amount: Number(exp.amount),
          status: exp.status || 'Approved',
          source: 'finance_expenses'
        })
      })

      approvalData?.forEach((req: any) => {
        const isExpense = req.type === 'expense' ||
          req.type === 'Expense Request' ||
          req.type?.toLowerCase().includes('expense')

        if (isExpense) {
          const details = req.details || {}
          combinedExpenses.push({
            id: req.id,
            date: req.finance_approved_at || req.daterequested,
            category: details.category || 'N/A',
            description: req.title || req.description,
            department: req.department || 'N/A',
            amount: Number(req.amount),
            status: req.status,
            financeApprovedBy: req.finance_approved_by,
            financeApprovedAt: req.finance_approved_at,
            source: 'approval_requests'
          })
        }
      })

      combinedExpenses.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })

      const total = combinedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      const rejected = combinedExpenses.filter(exp => exp.status === 'Rejected').length

      setExpenses(combinedExpenses)
      setStats({ total, count: combinedExpenses.length, rejected })
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-96 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Amount</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Requests</h3>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Rejected</h3>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finance Approved
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      expense.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      expense.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.financeApprovedBy && expense.financeApprovedAt ? (
                      <div>
                        <div>{expense.financeApprovedBy}</div>
                        <div className="text-xs">{format(new Date(expense.financeApprovedAt), 'MMM d, yyyy')}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

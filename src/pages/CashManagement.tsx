import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface CashTransaction {
  id: string
  type: string
  description: string
  amount: number
  time: string
  date: string
  created_at: string
}

interface CashBalance {
  id: string
  current_balance: number
  last_updated: string
  updated_by: string
  created_at: string
}

export const CashManagement = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [balance, setBalance] = useState<CashBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
  }, [dateFilter])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [transactionsResult, balanceResult] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .gte('date', dateFilter)
          .order('created_at', { ascending: false }),

        supabase
          .from('finance_cash_balance')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (balanceResult.error) throw balanceResult.error

      setTransactions(transactionsResult.data || [])
      setBalance(balanceResult.data)
    } catch (error: any) {
      console.error('Error fetching cash data:', error)
      alert('Failed to fetch cash management data')
    } finally {
      setLoading(false)
    }
  }

  const todayTransactions = transactions.filter(
    t => t.date === new Date().toISOString().split('T')[0]
  )

  const totalInflows = todayTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalOutflows = todayTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cash management data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Management</h1>
        <p className="text-gray-600">Daily cash float, transactions, and balancing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(balance?.current_balance || 0)}
              </p>
              {balance?.last_updated && (
                <p className="text-xs text-gray-500 mt-1">
                  Updated {formatDate(balance.last_updated)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Today's Inflows</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(totalInflows)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {todayTransactions.filter(t => t.amount > 0).length} transactions
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Today's Outflows</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(totalOutflows)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {todayTransactions.filter(t => t.amount < 0).length} transactions
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100 text-red-700">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Net Change</p>
              <p className={`text-2xl font-bold ${totalInflows - totalOutflows >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(totalInflows - totalOutflows)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Today's net flow
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              totalInflows - totalOutflows >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{transaction.time || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{transaction.description}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      transaction.amount >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {balance && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cash Balance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(balance.current_balance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(balance.last_updated)}</p>
                  {balance.updated_by && (
                    <p className="text-xs text-gray-500">by {balance.updated_by}</p>
                  )}
                </div>
              </div>
            </div>
            <Wallet className="w-16 h-16 text-green-600 opacity-20" />
          </div>
        </div>
      )}
    </div>
  )
}

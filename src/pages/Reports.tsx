import { useState, useEffect } from 'react'
import { FileText, Calendar, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface ReportData {
  cashTransactions: any[]
  coffeePayments: any[]
  expenseRequests: any[]
  coffeeLots: any[]
  cashBalance: any
  loading: boolean
}

type FilterType = 'day' | 'week' | 'month'

export const Reports = () => {
  const [reportData, setReportData] = useState<ReportData>({
    cashTransactions: [],
    coffeePayments: [],
    expenseRequests: [],
    coffeeLots: [],
    cashBalance: null,
    loading: true
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterType, setFilterType] = useState<FilterType>('day')
  const [expandedSections, setExpandedSections] = useState({
    daybook: true,
    cash: true,
    coffee: true,
    expenses: true,
    summary: true
  })

  useEffect(() => {
    fetchReportData()
  }, [selectedDate, filterType])

  const getDateRange = () => {
    const date = new Date(selectedDate)

    switch (filterType) {
      case 'day':
        return {
          start: startOfDay(date).toISOString(),
          end: endOfDay(date).toISOString()
        }
      case 'week':
        return {
          start: startOfWeek(date, { weekStartsOn: 1 }).toISOString(),
          end: endOfWeek(date, { weekStartsOn: 1 }).toISOString()
        }
      case 'month':
        return {
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString()
        }
    }
  }

  const fetchReportData = async () => {
    try {
      setReportData(prev => ({ ...prev, loading: true }))

      const { start, end } = getDateRange()

      const [cashTx, coffeePayments, expenses, coffeeLots, balance] = await Promise.all([
        supabase
          .from('finance_cash_transactions')
          .select('*')
          .eq('status', 'confirmed')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),

        supabase
          .from('payment_records')
          .select('*')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false }),

        supabase
          .from('approval_requests')
          .select('*')
          .eq('type', 'Expense Request')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),

        supabase
          .from('finance_coffee_lots')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),

        supabase
          .from('finance_cash_balance')
          .select('*')
          .single()
      ])

      setReportData({
        cashTransactions: cashTx.data || [],
        coffeePayments: coffeePayments.data || [],
        expenseRequests: expenses.data || [],
        coffeeLots: coffeeLots.data || [],
        cashBalance: balance.data,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
      setReportData(prev => ({ ...prev, loading: false }))
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateSummary = () => {
    const totalDeposits = reportData.cashTransactions
      .filter(tx => tx.transaction_type === 'DEPOSIT')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const totalPayments = reportData.cashTransactions
      .filter(tx => tx.transaction_type === 'PAYMENT')
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)

    const paidCoffeePayments = reportData.coffeePayments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const pendingCoffeePayments = reportData.coffeePayments
      .filter(p => p.status === 'Pending')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const approvedExpenses = reportData.expenseRequests
      .filter(e => e.status === 'Approved')
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const pendingExpenses = reportData.expenseRequests
      .filter(e => e.status === 'Pending')
      .reduce((sum, e) => sum + Number(e.amount), 0)

    return {
      totalDeposits,
      totalPayments,
      paidCoffeePayments,
      pendingCoffeePayments,
      approvedExpenses,
      pendingExpenses,
      currentBalance: Number(reportData.cashBalance?.current_balance || 0)
    }
  }

  if (reportData.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  const summary = calculateSummary()

  const getDateRangeLabel = () => {
    const date = new Date(selectedDate)
    const { start, end } = getDateRange()

    switch (filterType) {
      case 'day':
        return format(date, 'MMMM dd, yyyy')
      case 'week':
        return `${format(new Date(start), 'MMM dd')} - ${format(new Date(end), 'MMM dd, yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Reports</h1>
          <p className="text-gray-600">{getDateRangeLabel()}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterType('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setFilterType('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Financial Summary</h2>
          </div>
          {expandedSections.summary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expandedSections.summary && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Current Balance</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(summary.currentBalance)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Total Deposits</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(summary.totalDeposits)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600 font-medium">Total Payments</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{formatCurrency(summary.totalPayments)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium">Approved Expenses</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(summary.approvedExpenses)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('daybook')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Day Book</h2>
          </div>
          {expandedSections.daybook ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expandedSections.daybook && (
          <div className="px-6 pb-6">
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Opening Balance</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.currentBalance)}</p>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Cash In (Deposits)</p>
                      <p className="text-sm text-gray-500">{reportData.cashTransactions.filter(t => t.transaction_type === 'DEPOSIT').length} transactions</p>
                    </div>
                    <p className="text-lg font-bold text-green-600">+{formatCurrency(summary.totalDeposits)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Cash Out (Payments)</p>
                      <p className="text-sm text-gray-500">{reportData.cashTransactions.filter(t => t.transaction_type === 'PAYMENT').length} transactions</p>
                    </div>
                    <p className="text-lg font-bold text-red-600">-{formatCurrency(summary.totalPayments)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Coffee Payments (Paid)</p>
                      <p className="text-sm text-gray-500">{reportData.coffeePayments.filter(p => p.status === 'Paid').length} payments</p>
                    </div>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.paidCoffeePayments)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Approved Expenses</p>
                      <p className="text-sm text-gray-500">{reportData.expenseRequests.filter(e => e.status === 'Approved').length} expenses</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.approvedExpenses)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-300 mt-4 pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Closing Balance</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summary.currentBalance + summary.totalDeposits - summary.totalPayments)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Period Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Transactions</p>
                    <p className="font-bold text-gray-900">{reportData.cashTransactions.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Coffee Payments</p>
                    <p className="font-bold text-gray-900">{reportData.coffeePayments.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pending Coffee</p>
                    <p className="font-bold text-gray-900">{formatCurrency(summary.pendingCoffeePayments)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pending Expenses</p>
                    <p className="font-bold text-gray-900">{formatCurrency(summary.pendingExpenses)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('cash')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Cash Transactions ({reportData.cashTransactions.length})</h2>
          </div>
          {expandedSections.cash ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expandedSections.cash && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.cashTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.transaction_type === 'DEPOSIT' ? 'bg-green-100 text-green-700' :
                          tx.transaction_type === 'PAYMENT' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tx.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {formatCurrency(Number(tx.balance_after))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tx.created_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('coffee')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-semibold text-gray-900">Coffee Payments ({reportData.coffeePayments.length})</h2>
          </div>
          {expandedSections.coffee ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expandedSections.coffee && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.coffeePayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(payment.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.supplier}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.batch_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.method}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Paid' ? 'bg-green-100 text-green-700' :
                          payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => toggleSection('expenses')}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Expense Requests ({reportData.expenseRequests.length})</h2>
          </div>
          {expandedSections.expenses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {expandedSections.expenses && (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.expenseRequests.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(expense.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{expense.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{expense.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{expense.requestedby}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          expense.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          expense.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          expense.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {expense.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

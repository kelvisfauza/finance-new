import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { FileText, Download, Calendar, Printer } from 'lucide-react'

interface ReportData {
  openingBalance: number
  closingBalance: number
  totalCashIn: number
  totalCashOut: number
  coffeePaid: number
  expensesPaid: number
  salesRevenue: number
  cashTransactions: any[]
  coffeePayments: any[]
  expenses: any[]
  salesTransactions: any[]
}

export const FinanceMonthlyReport = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  const generateReport = async () => {
    try {
      setLoading(true)

      const startStr = `${startDate}T00:00:00`
      const endStr = `${endDate}T23:59:59`

      const [cashTransResult, paymentsResult, expensesResult, approvalExpensesResult, salesResult, openingBalanceResult] = await Promise.all([
        supabase
          .from('finance_cash_transactions')
          .select('*')
          .gte('confirmed_at', startStr)
          .lte('confirmed_at', endStr)
          .eq('status', 'confirmed'),

        supabase
          .from('payment_records')
          .select('amount, supplier, status, method, date, batch_number')
          .gte('date', startDate)
          .lte('date', endDate),

        supabase
          .from('finance_expenses')
          .select('amount, category, description, date')
          .gte('date', startDate)
          .lte('date', endDate),

        supabase
          .from('approval_requests')
          .select('amount, title, status, daterequested')
          .eq('type', 'Expense Request')
          .eq('status', 'Approved')
          .gte('daterequested', startDate)
          .lte('daterequested', endDate),

        supabase
          .from('sales_transactions')
          .select('total_amount, customer, date')
          .gte('date', startDate)
          .lte('date', endDate),

        supabase
          .from('finance_cash_transactions')
          .select('balance_after')
          .lt('confirmed_at', startStr)
          .eq('status', 'confirmed')
          .order('confirmed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      if (cashTransResult.error) throw cashTransResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (expensesResult.error) throw expensesResult.error
      if (salesResult.error) throw salesResult.error

      const cashTransactions = cashTransResult.data || []
      const coffeePayments = paymentsResult.data || []
      const financeExpenses = expensesResult.data || []
      const approvalExpenses = approvalExpensesResult.data || []
      const salesTransactions = salesResult.data || []

      const totalCashIn = cashTransactions
        .filter((t: any) => t.amount > 0)
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

      const totalCashOut = Math.abs(cashTransactions
        .filter((t: any) => t.amount < 0)
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0))

      const coffeePaid = coffeePayments
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      const expensesPaid = financeExpenses
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0) +
        approvalExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

      const salesRevenue = salesTransactions
        .reduce((sum: number, s: any) => sum + Number(s.total_amount), 0)

      const openingBalance = openingBalanceResult.data?.balance_after || 0
      const closingBalance = openingBalance + totalCashIn - totalCashOut

      setReportData({
        openingBalance,
        closingBalance,
        totalCashIn,
        totalCashOut,
        coffeePaid,
        expensesPaid,
        salesRevenue,
        cashTransactions,
        coffeePayments,
        expenses: [...financeExpenses, ...approvalExpenses],
        salesTransactions
      })
    } catch (error: any) {
      console.error('Error generating report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!reportData) return

    const exportData = {
      summary: [{
        'Opening Balance': reportData.openingBalance,
        'Total Cash In': reportData.totalCashIn,
        'Total Cash Out': reportData.totalCashOut,
        'Closing Balance': reportData.closingBalance,
        'Coffee Payments': reportData.coffeePaid,
        'Expenses': reportData.expensesPaid,
        'Sales Revenue': reportData.salesRevenue
      }],
      transactions: reportData.cashTransactions.map(t => ({
        Date: formatDate(t.confirmed_at),
        Type: t.transaction_type,
        Amount: t.amount,
        Reference: t.reference || '',
        Notes: t.notes || '',
        'Created By': t.created_by
      })),
      payments: reportData.coffeePayments.map(p => ({
        Date: p.date,
        Supplier: p.supplier,
        Batch: p.batch_number,
        Amount: p.amount,
        Method: p.method
      })),
      expenses: reportData.expenses.map(e => ({
        Date: e.date || e.daterequested,
        Description: e.description || e.title,
        Category: e.category || 'Expense Request',
        Amount: e.amount
      }))
    }

    exportToCSV(exportData.summary, `finance-report-summary-${startDate}-to-${endDate}`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:border-0 print:shadow-none print:p-0">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600 print:hidden" />
            Finance Monthly Report
          </h3>
          {reportData && (
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Printer className="w-5 h-5 mr-2" />
                Print
              </button>
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Export
              </button>
            </div>
          )}
        </div>

        <div className="print:block print:mb-4 hidden">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Report Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Generated:</span> {formatDate(new Date().toISOString())}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium print:hidden"
        >
          {loading ? 'Generating Report...' : 'Generate Report'}
        </button>
      </div>

      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
              <p className="text-sm font-medium text-blue-800 mb-1">Opening Balance</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(reportData.openingBalance)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
              <p className="text-sm font-medium text-green-800 mb-1">Total Cash In</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(reportData.totalCashIn)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
              <p className="text-sm font-medium text-red-800 mb-1">Total Cash Out</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(reportData.totalCashOut)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
              <p className="text-sm font-medium text-purple-800 mb-1">Closing Balance</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(reportData.closingBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Coffee Payments</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.coffeePaid)}</p>
              <p className="text-sm text-gray-500 mt-1">{reportData.coffeePayments.length} transactions</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Expenses</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.expensesPaid)}</p>
              <p className="text-sm text-gray-500 mt-1">{reportData.expenses.length} items</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Sales Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.salesRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">{reportData.salesTransactions.length} sales</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.cashTransactions.slice(0, 10).map((transaction, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{formatDate(transaction.confirmed_at)}</td>
                      <td className="py-3 px-4 text-sm">{transaction.transaction_type}</td>
                      <td className="py-3 px-4 text-sm">{transaction.reference || '-'}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        transaction.amount >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          .bg-gradient-to-br {
            background: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  )
}

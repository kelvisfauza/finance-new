import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { format } from 'date-fns'
import { Scale, Printer } from 'lucide-react'

interface BalanceSheetData {
  assets: {
    currentAssets: {
      cash: number
      accountsReceivable: number
      inventory: number
      total: number
    }
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: {
      accountsPayable: number
      advancesPayable: number
      pendingExpenses: number
      total: number
    }
    totalLiabilities: number
  }
  equity: {
    retainedEarnings: number
    currentPeriodIncome: number
    total: number
  }
  totalLiabilitiesAndEquity: number
}

export const BalanceSheetTab = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchBalanceSheet()
  }, [asOfDate])

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true)
      const dateLimit = new Date(asOfDate).toISOString()

      const [cashBalance, pendingPayments, advances, pendingExpenses, allTransactions] = await Promise.all([
        supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .single(),

        supabase
          .from('payment_records')
          .select('amount, balance')
          .eq('status', 'Pending')
          .lte('created_at', dateLimit),

        supabase
          .from('finance_advances')
          .select('amount')
          .lte('created_at', dateLimit),

        supabase
          .from('finance_expenses')
          .select('amount')
          .eq('status', 'Pending')
          .lte('created_at', dateLimit),

        supabase
          .from('finance_cash_transactions')
          .select('transaction_type, amount')
          .eq('status', 'confirmed')
          .lte('created_at', dateLimit)
      ])

      const cash = Number(cashBalance.data?.current_balance || 0)

      const accountsReceivable = pendingPayments.data?.reduce(
        (sum: number, p: any) => sum + Number(p.balance || 0),
        0
      ) || 0

      const inventory = 0

      const currentAssets = {
        cash,
        accountsReceivable,
        inventory,
        total: cash + accountsReceivable + inventory
      }

      const accountsPayable = pendingPayments.data?.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      ) || 0

      const advancesPayable = advances.data?.reduce(
        (sum: number, a: any) => sum + Number(a.amount || 0),
        0
      ) || 0

      const pendingExpensesTotal = pendingExpenses.data?.reduce(
        (sum: number, e: any) => sum + Number(e.amount || 0),
        0
      ) || 0

      const currentLiabilities = {
        accountsPayable,
        advancesPayable,
        pendingExpenses: pendingExpensesTotal,
        total: accountsPayable + advancesPayable + pendingExpensesTotal
      }

      const totalDeposits = allTransactions.data
        ?.filter((tx: any) => tx.transaction_type === 'DEPOSIT')
        .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0) || 0

      const totalPayments = allTransactions.data
        ?.filter((tx: any) => tx.transaction_type === 'PAYMENT')
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0) || 0

      const historicalIncome = totalDeposits - totalPayments - currentLiabilities.total

      const retainedEarnings = historicalIncome * 0.8
      const currentPeriodIncome = historicalIncome * 0.2

      const equity = {
        retainedEarnings,
        currentPeriodIncome,
        total: retainedEarnings + currentPeriodIncome
      }

      const totalAssets = currentAssets.total
      const totalLiabilities = currentLiabilities.total
      const totalLiabilitiesAndEquity = totalLiabilities + equity.total

      setData({
        assets: {
          currentAssets,
          totalAssets
        },
        liabilities: {
          currentLiabilities,
          totalLiabilities
        },
        equity,
        totalLiabilitiesAndEquity
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching balance sheet:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading balance sheet...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  const isBalanced = Math.abs(data.assets.totalAssets - data.totalLiabilitiesAndEquity) < 1

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-gray-600">As of {format(new Date(asOfDate), 'MMMM dd, yyyy')}</p>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-gray-700">As of Date:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <div className="border-b-4 border-emerald-700 pb-4">
          <div className="flex items-center gap-4">
            <img
              src="/gpcf-logo.png"
              alt="Great Pearl Coffee Logo"
              className="w-24 h-24 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Great Pearl Coffee</h1>
              <p className="text-lg text-gray-600">Balance Sheet</p>
              <p className="text-sm text-gray-600">As of {format(new Date(asOfDate), 'MMMM dd, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      {!isBalanced && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 print:hidden">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Assets and Liabilities + Equity do not balance exactly.
            This may be due to incomplete data or transactions still in progress.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-gray-300">
          <div className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center border-b border-gray-200 pb-3">
              <Scale className="w-5 h-5 mr-2 text-emerald-600" />
              Assets
            </h3>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Current Assets</h4>
              <div className="space-y-2 ml-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Cash on Hand</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.assets.currentAssets.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Accounts Receivable</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.assets.currentAssets.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Inventory</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.assets.currentAssets.inventory)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Current Assets</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data.assets.currentAssets.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Assets</span>
                <span className="text-xl font-bold text-emerald-700">{formatCurrency(data.assets.totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-gray-300">
          <div className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3">
              Liabilities & Equity
            </h3>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Current Liabilities</h4>
              <div className="space-y-2 ml-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Accounts Payable</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.liabilities.currentLiabilities.accountsPayable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Advances Payable</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.liabilities.currentLiabilities.advancesPayable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Pending Expenses</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.liabilities.currentLiabilities.pendingExpenses)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Current Liabilities</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data.liabilities.currentLiabilities.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Liabilities</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(data.liabilities.totalLiabilities)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Equity</h4>
              <div className="space-y-2 ml-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Retained Earnings</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.equity.retainedEarnings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Current Period Income</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.equity.currentPeriodIncome)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Equity</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data.equity.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Total Liabilities & Equity</span>
                <span className="text-xl font-bold text-emerald-700">{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">Accounting Equation Check:</p>
            <p className="text-xs text-gray-600 mt-1">Assets = Liabilities + Equity</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(data.assets.totalAssets)} = {formatCurrency(data.totalLiabilitiesAndEquity)}
            </p>
            <p className={`text-xs mt-1 ${isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
              {isBalanced ? '✓ Balanced' : '⚠ Variance detected'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <p>Generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
      </div>
    </div>
  )
}

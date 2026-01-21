import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { TrendingUp, TrendingDown, DollarSign, Printer } from 'lucide-react'

interface IncomeStatementData {
  revenue: {
    coffeeIncome: number
    otherIncome: number
    total: number
  }
  costOfGoodsSold: {
    coffeePayments: number
    directCosts: number
    total: number
  }
  operatingExpenses: {
    salaries: number
    utilities: number
    transport: number
    office: number
    marketing: number
    other: number
    total: number
  }
  grossProfit: number
  operatingIncome: number
  netIncome: number
}

type PeriodType = 'month' | 'quarter' | 'year' | 'custom'

export const IncomeStatementTab = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchIncomeStatement()
  }, [periodType, selectedDate, dateFrom, dateTo])

  const getDateRange = () => {
    const date = new Date(selectedDate)

    if (periodType === 'custom' && dateFrom && dateTo) {
      return {
        start: new Date(dateFrom).toISOString(),
        end: new Date(dateTo).toISOString()
      }
    }

    switch (periodType) {
      case 'month':
        return {
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString()
        }
      case 'year':
        return {
          start: startOfYear(date).toISOString(),
          end: endOfYear(date).toISOString()
        }
      default:
        return {
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString()
        }
    }
  }

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      const [cashTx, coffeePayments, expenses] = await Promise.all([
        supabase
          .from('finance_cash_transactions')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end),

        supabase
          .from('payment_records')
          .select('*')
          .eq('status', 'Paid')
          .gte('date', start)
          .lte('date', end),

        supabase
          .from('finance_expenses')
          .select('*')
          .gte('date', start)
          .lte('date', end)
      ])

      const deposits = cashTx.data?.filter((tx: any) => tx.transaction_type === 'DEPOSIT') || []
      const totalDeposits = deposits.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)

      const totalCoffeePayments = coffeePayments.data?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0

      const expensesByCategory = {
        salaries: 0,
        utilities: 0,
        transport: 0,
        office: 0,
        marketing: 0,
        other: 0
      }

      expenses.data?.forEach((exp: any) => {
        const amount = Number(exp.amount || 0)
        const category = exp.category?.toLowerCase() || 'other'

        if (category.includes('salary') || category.includes('wage') || category.includes('payroll')) {
          expensesByCategory.salaries += amount
        } else if (category.includes('utility') || category.includes('electric') || category.includes('water')) {
          expensesByCategory.utilities += amount
        } else if (category.includes('transport') || category.includes('fuel') || category.includes('vehicle')) {
          expensesByCategory.transport += amount
        } else if (category.includes('office') || category.includes('supplies') || category.includes('stationery')) {
          expensesByCategory.office += amount
        } else if (category.includes('marketing') || category.includes('advertising')) {
          expensesByCategory.marketing += amount
        } else {
          expensesByCategory.other += amount
        }
      })

      const totalOperatingExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0)
      const grossProfit = totalDeposits - totalCoffeePayments
      const operatingIncome = grossProfit - totalOperatingExpenses
      const netIncome = operatingIncome

      setData({
        revenue: {
          coffeeIncome: totalDeposits,
          otherIncome: 0,
          total: totalDeposits
        },
        costOfGoodsSold: {
          coffeePayments: totalCoffeePayments,
          directCosts: 0,
          total: totalCoffeePayments
        },
        operatingExpenses: {
          ...expensesByCategory,
          total: totalOperatingExpenses
        },
        grossProfit,
        operatingIncome,
        netIncome
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching income statement:', error)
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

  const getPeriodLabel = () => {
    const date = new Date(selectedDate)
    const { start, end } = getDateRange()

    if (periodType === 'custom') {
      return `${format(new Date(start), 'MMM dd, yyyy')} - ${format(new Date(end), 'MMM dd, yyyy')}`
    }

    switch (periodType) {
      case 'month':
        return format(date, 'MMMM yyyy')
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, 'MMMM yyyy')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading income statement...</div>
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

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Income Statement</h2>
          <p className="text-gray-600">{getPeriodLabel()}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodType === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodType === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodType === 'custom'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Custom
            </button>
          </div>

          {periodType !== 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          )}

          {periodType === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </>
          )}

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
              <p className="text-lg text-gray-600">Income Statement</p>
              <p className="text-sm text-gray-600">{getPeriodLabel()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-gray-300">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Revenue
            </h3>
            <div className="space-y-2 ml-7">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Coffee Sales & Income</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.revenue.coffeeIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Other Income</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.revenue.otherIncome)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Revenue</span>
                <span className="font-bold text-gray-900">{formatCurrency(data.revenue.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Cost of Goods Sold</h3>
            <div className="space-y-2 ml-7">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Coffee Purchases</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.costOfGoodsSold.coffeePayments)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Direct Costs</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.costOfGoodsSold.directCosts)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total COGS</span>
                <span className="font-bold text-gray-900">{formatCurrency(data.costOfGoodsSold.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Gross Profit
              </span>
              <span className={`text-xl font-bold ${data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.grossProfit)}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Operating Expenses</h3>
            <div className="space-y-2 ml-7">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Salaries & Wages</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.salaries)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Utilities</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.utilities)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Transport & Fuel</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.transport)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Office & Supplies</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.office)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Marketing & Advertising</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.marketing)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Other Expenses</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.operatingExpenses.other)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Operating Expenses</span>
                <span className="font-bold text-gray-900">{formatCurrency(data.operatingExpenses.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Operating Income</span>
              <span className={`text-xl font-bold ${data.operatingIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(data.operatingIncome)}
              </span>
            </div>
          </div>

          <div className={`rounded-lg p-6 ${data.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900 flex items-center">
                {data.netIncome >= 0 ? (
                  <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 mr-2 text-red-600" />
                )}
                Net Income
              </span>
              <span className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.netIncome)}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <p>Generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

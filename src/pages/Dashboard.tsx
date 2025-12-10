import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useFinanceStats } from '../hooks/useFinanceStats'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { formatCurrency } from '../lib/utils'
import { MarketPricesCard } from '../components/MarketPricesCard'
import {
  Coffee,
  HandCoins,
  Wallet,
  TrendingUp,
  Receipt,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.text}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

type MonthlySummary = {
  monthKey: string
  label: string
  totalIn: number
  totalOut: number
  net: number
}

type DailyPoint = {
  date: string
  cashIn: number
  cashOut: number
}

const currency = (value: number) =>
  new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(value)

export const Dashboard = () => {
  const stats = useFinanceStats()
  const [months, setMonths] = useState<MonthlySummary[]>([])
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('')
  const [dailyData, setDailyData] = useState<DailyPoint[]>([])
  const [todayCashIn, setTodayCashIn] = useState(0)
  const [todayCashOut, setTodayCashOut] = useState(0)
  const [pendingFinanceCount, setPendingFinanceCount] = useState(0)
  const [pendingAdminCount, setPendingAdminCount] = useState(0)

  const fetchMonthlyData = useCallback(async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('finance_cash_transactions')
        .select('created_at, transaction_type, amount')
        .order('created_at', { ascending: false })

      if (error) throw error

      const monthMap = new Map<string, { in: number; out: number }>()

      transactions?.forEach((t: any) => {
        const monthKey = t.created_at.substring(0, 7)
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { in: 0, out: 0 })
        }
        const month = monthMap.get(monthKey)!
        if (t.transaction_type === 'deposit' || t.transaction_type === 'income') {
          month.in += Number(t.amount)
        } else {
          month.out += Number(t.amount)
        }
      })

      const monthSummaries: MonthlySummary[] = Array.from(monthMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([monthKey, data]) => {
          const date = new Date(monthKey + '-01')
          const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          return {
            monthKey,
            label,
            totalIn: data.in,
            totalOut: data.out,
            net: data.in - data.out,
          }
        })

      setMonths(monthSummaries)
      if (monthSummaries.length > 0 && !selectedMonthKey) {
        setSelectedMonthKey(monthSummaries[0].monthKey)
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error)
    }
  }, [selectedMonthKey])

  const fetchDailyData = useCallback(async (monthKey: string) => {
    try {
      const [year, month] = monthKey.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      const startDateStr = startDate.toISOString()
      const endDateStr = endDate.toISOString()

      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('created_at, transaction_type, amount')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: true })

      if (error) throw error

      const dailyMap = new Map<string, { in: number; out: number }>()

      data?.forEach((t: any) => {
        const dateOnly = t.created_at.substring(0, 10)
        if (!dailyMap.has(dateOnly)) {
          dailyMap.set(dateOnly, { in: 0, out: 0 })
        }
        const day = dailyMap.get(dateOnly)!
        if (t.transaction_type === 'deposit' || t.transaction_type === 'income') {
          day.in += Number(t.amount)
        } else {
          day.out += Number(t.amount)
        }
      })

      const points: DailyPoint[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        cashIn: data.in,
        cashOut: data.out,
      }))

      setDailyData(points)
    } catch (error) {
      console.error('Error fetching daily data:', error)
    }
  }, [])

  const fetchTodayData = useCallback(async () => {
    try {
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('transaction_type, amount')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)

      if (error) throw error

      let cashIn = 0
      let cashOut = 0

      data?.forEach((t: any) => {
        if (t.transaction_type === 'deposit' || t.transaction_type === 'income') {
          cashIn += Number(t.amount)
        } else {
          cashOut += Number(t.amount)
        }
      })

      setTodayCashIn(cashIn)
      setTodayCashOut(cashOut)
    } catch (error) {
      console.error('Error fetching today data:', error)
    }
  }, [])

  const fetchApprovalCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('status, finance_approved')

      if (error) throw error

      const pendingFinance = data?.filter(
        (a: any) => !a.finance_approved && (a.status === 'Pending' || a.status === 'Pending Finance')
      ).length || 0

      const pendingAdmin = data?.filter(
        (a: any) => a.finance_approved && a.status === 'Pending Admin Approval'
      ).length || 0

      setPendingFinanceCount(pendingFinance)
      setPendingAdminCount(pendingAdmin)
    } catch (error) {
      console.error('Error fetching approval counts:', error)
    }
  }, [])

  const refreshData = useCallback(() => {
    fetchMonthlyData()
    fetchTodayData()
    fetchApprovalCounts()
    if (selectedMonthKey) {
      fetchDailyData(selectedMonthKey)
    }
  }, [fetchMonthlyData, fetchTodayData, fetchApprovalCounts, fetchDailyData, selectedMonthKey])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (selectedMonthKey) {
      fetchDailyData(selectedMonthKey)
    }
  }, [selectedMonthKey, fetchDailyData])

  useRealtimeSubscription(
    ['finance_cash_transactions', 'approval_requests'],
    refreshData
  )

  const currentMonth = useMemo(
    () => months.find(m => m.monthKey === selectedMonthKey) ?? months[0],
    [selectedMonthKey, months]
  )

  const maxAbsValue = useMemo(() => {
    const values = dailyData.flatMap(d => [d.cashIn, d.cashOut])
    return values.length ? Math.max(...values) : 1
  }, [dailyData])

  const monthNetTrendColor = currentMonth?.net >= 0 ? 'text-green-600' : 'text-red-600'

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (stats.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700">{stats.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
        <p className="text-gray-600">Overview of financial operations and cash flow</p>
      </div>

      {currentMonth && months.length > 0 && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div>
              <p className="text-sm text-gray-600 font-medium">Monthly Overview</p>
              <p className="text-lg font-bold text-gray-900">{currentMonth.label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {months.map(month => (
                <button
                  key={month.monthKey}
                  onClick={() => setSelectedMonthKey(month.monthKey)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selectedMonthKey === month.monthKey
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                  }`}
                >
                  {month.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Cash In</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {currency(currentMonth.totalIn)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">Deposits & income this month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Cash Out</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {currency(currentMonth.totalOut)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <ArrowDownRight className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">Payments & expenses this month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Net Position</p>
                  <p className={`mt-2 text-2xl font-bold ${monthNetTrendColor}`}>
                    {currency(currentMonth.net)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">Net cash for {currentMonth.label}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Today's Net</p>
                  <p className={`mt-2 text-2xl font-bold ${
                    todayCashIn - todayCashOut >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currency(todayCashIn - todayCashOut)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">Cash movement today</p>
            </div>
          </div>

          {dailyData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Daily Cash Movement – {currentMonth.label}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                    In
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                    Out
                  </div>
                </div>
              </div>

              <div className="grid h-64 grid-cols-[auto,1fr] gap-4">
                <div className="flex flex-col justify-between text-xs text-gray-500 font-medium">
                  <span>{currency(maxAbsValue)}</span>
                  <span>{currency(Math.round(maxAbsValue * 0.66))}</span>
                  <span>{currency(Math.round(maxAbsValue * 0.33))}</span>
                  <span>0</span>
                </div>

                <div className="flex items-end gap-2 overflow-x-auto pb-2">
                  {dailyData.map(point => {
                    const inHeight = (point.cashIn / maxAbsValue) * 100
                    const outHeight = (point.cashOut / maxAbsValue) * 100
                    const shortDate = point.date.slice(-2)

                    return (
                      <div key={point.date} className="flex flex-col items-center gap-2 min-w-[32px]">
                        <div className="flex h-52 w-8 flex-col justify-end gap-1">
                          <div
                            className="rounded-t bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"
                            style={{ height: `${inHeight}%` }}
                            title={`In: ${currency(point.cashIn)}`}
                          />
                          <div
                            className="rounded-b bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
                            style={{ height: `${outHeight}%` }}
                            title={`Out: ${currency(point.cashOut)}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{shortDate}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Pending Coffee Payments"
          value={`${stats.pendingCoffeePayments} lots`}
          icon={Coffee}
          color="emerald"
        />
        <StatCard
          title="Pending Payment Amount"
          value={formatCurrency(stats.pendingCoffeeAmount)}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Available Cash"
          value={formatCurrency(stats.availableCash)}
          icon={Wallet}
          color="green"
        />
        <StatCard
          title="Outstanding Advances"
          value={formatCurrency(stats.advanceAmount)}
          icon={HandCoins}
          color="orange"
        />
        <StatCard
          title="Pending Approvals"
          value={`${pendingFinanceCount + pendingAdminCount} items`}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Pending Expense Requests"
          value={`${stats.pendingExpenseRequests} requests`}
          icon={Receipt}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MarketPricesCard />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/coffee-payments"
              className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center">
                <Coffee className="w-5 h-5 text-emerald-700 mr-3" />
                <span className="font-medium text-gray-900">Process Coffee Payments</span>
              </div>
              <span className="text-sm text-emerald-700">{stats.pendingCoffeePayments} pending</span>
            </a>
            <a
              href="/expenses"
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center">
                <Receipt className="w-5 h-5 text-orange-700 mr-3" />
                <span className="font-medium text-gray-900">Review Expense Requests</span>
              </div>
              <span className="text-sm text-orange-700">{stats.pendingExpenseRequests} pending</span>
            </a>
            <a
              href="/cash-management"
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <Wallet className="w-5 h-5 text-blue-700 mr-3" />
                <span className="font-medium text-gray-900">Manage Cash Float</span>
              </div>
              <span className="text-sm text-blue-700">{formatCurrency(stats.availableCash)}</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Approvals & Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-700 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pending Finance Review</p>
                  <p className="text-xs text-gray-600">Waiting for finance approval</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-700">{pendingFinanceCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-700 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pending Admin Approval</p>
                  <p className="text-xs text-gray-600">Ready for final approval</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-700">{pendingAdminCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-700 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Completed Today</p>
                  <p className="text-xs text-gray-600">{formatCurrency(stats.completedTodayAmount)}</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-700">{stats.completedToday}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

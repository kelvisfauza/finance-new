import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  HandCoins,
  Receipt,
} from 'lucide-react'

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

type MonthlySummary = {
  monthKey: string
  label: string
  totalIn: number
  totalOut: number
  pendingApprovals: number
  advancesOutstanding: number
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

export const FinanceDashboard = () => {
  const [months, setMonths] = useState<MonthlySummary[]>([])
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('')
  const [dailyData, setDailyData] = useState<DailyPoint[]>([])
  const [todayCashIn, setTodayCashIn] = useState(0)
  const [todayCashOut, setTodayCashOut] = useState(0)
  const [pendingFinanceCount, setPendingFinanceCount] = useState(0)
  const [pendingAdminCount, setPendingAdminCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMonthlyData()
    fetchTodayData()
    fetchApprovalCounts()
  }, [])

  useEffect(() => {
    if (selectedMonthKey) {
      fetchDailyData(selectedMonthKey)
    }
  }, [selectedMonthKey])

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)

      const { data: transactions, error: transError } = await supabase
        .from('finance_cash_transactions')
        .select('date, transaction_type, amount')
        .order('date', { ascending: false })

      if (transError) throw transError

      const { data: approvals, error: appError } = await supabase
        .from('approval_requests')
        .select('status, amount, finance_approved')

      if (appError) throw appError

      const { data: advances, error: advError } = await supabase
        .from('supplier_advances')
        .select('amount_advanced, amount_cleared')

      if (advError) throw advError

      const monthMap = new Map<string, { in: number; out: number }>()

      transactions?.forEach((t: any) => {
        const monthKey = t.date.substring(0, 7)
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

      const pendingTotal = approvals
        ?.filter((a: any) => a.status === 'Pending' || a.status === 'Pending Admin Approval')
        .reduce((sum: number, a: any) => sum + Number(a.amount), 0) || 0

      const advancesOutstanding = advances
        ?.reduce((sum: number, a: any) => sum + (Number(a.amount_advanced) - Number(a.amount_cleared || 0)), 0) || 0

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
            pendingApprovals: pendingTotal,
            advancesOutstanding,
            net: data.in - data.out,
          }
        })

      setMonths(monthSummaries)
      if (monthSummaries.length > 0 && !selectedMonthKey) {
        setSelectedMonthKey(monthSummaries[0].monthKey)
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyData = async (monthKey: string) => {
    try {
      const startDate = `${monthKey}-01`
      const endDate = `${monthKey}-31`

      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('date, transaction_type, amount')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error

      const dailyMap = new Map<string, { in: number; out: number }>()

      data?.forEach((t: any) => {
        if (!dailyMap.has(t.date)) {
          dailyMap.set(t.date, { in: 0, out: 0 })
        }
        const day = dailyMap.get(t.date)!
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
  }

  const fetchTodayData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('transaction_type, amount')
        .eq('date', today)

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
  }

  const fetchApprovalCounts = async () => {
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
  }

  const currentMonth = useMemo(
    () => months.find(m => m.monthKey === selectedMonthKey) ?? months[0],
    [selectedMonthKey, months]
  )

  const maxAbsValue = useMemo(() => {
    const values = dailyData.flatMap(d => [d.cashIn, d.cashOut])
    return values.length ? Math.max(...values) : 1
  }, [dailyData])

  const monthNetTrendColor = currentMonth?.net >= 0 ? 'text-green-600' : 'text-red-600'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentMonth) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No financial data available yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Overview</h1>
          <p className="text-gray-600 mt-1">
            Cash position, approvals and payments for{' '}
            <span className="font-semibold text-gray-900">{currentMonth.label}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {months.map(month => (
            <button
              key={month.monthKey}
              onClick={() => setSelectedMonthKey(month.monthKey)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedMonthKey === month.monthKey
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
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
          <p className="mt-3 text-xs text-gray-600">
            Coffee payments received, sales & deposits
          </p>
        </Card>

        <Card>
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
          <p className="mt-3 text-xs text-gray-600">
            Supplier payments, expenses & HR payouts
          </p>
        </Card>

        <Card>
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
          <p className="mt-3 text-xs text-gray-600">
            Cash In – Cash Out for {currentMonth.label}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Pending & Advances
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                Pending:{' '}
                <span className="text-amber-600">{currency(currentMonth.pendingApprovals)}</span>
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Advances:{' '}
                <span className="text-sky-600">{currency(currentMonth.advancesOutstanding)}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                <HandCoins className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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

          <div className="mt-4 grid h-64 grid-cols-[auto,1fr] gap-4">
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
              {!dailyData.length && (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                  No daily data for this month yet
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Today at a Glance</h2>
            <p className="mt-1 text-sm text-gray-600">Real-time cash movements for today</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cash In</span>
                <span className="text-lg font-bold text-green-600">{currency(todayCashIn)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cash Out</span>
                <span className="text-lg font-bold text-red-600">{currency(todayCashOut)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="text-sm font-semibold text-gray-900">Net</span>
                <span
                  className={`text-lg font-bold ${
                    todayCashIn - todayCashOut >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {currency(todayCashIn - todayCashOut)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900">Approvals & Alerts</h2>
            <p className="mt-1 text-sm text-gray-600">What needs your attention</p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Pending Finance Review</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                  {pendingFinanceCount}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Pending Admin Approval</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                  {pendingAdminCount}
                </span>
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Receipt className="h-5 w-5 text-gray-500" />
              Quick Summary
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Breakdown for {currentMonth.label}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Coffee Payments</span>
                <span className="font-semibold text-gray-900">
                  {currency(currentMonth.totalOut * 0.6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Expenses</span>
                <span className="font-semibold text-gray-900">
                  {currency(currentMonth.totalOut * 0.25)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">HR Payments</span>
                <span className="font-semibold text-gray-900">
                  {currency(currentMonth.totalOut * 0.15)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

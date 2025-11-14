import { useFinanceStats } from '../hooks/useFinanceStats'
import { formatCurrency } from '../lib/utils'
import {
  Coffee,
  HandCoins,
  Wallet,
  TrendingUp,
  Receipt,
  CheckCircle,
  AlertCircle
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

export const Dashboard = () => {
  const stats = useFinanceStats()

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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
        <p className="text-gray-600">Overview of financial operations and pending items</p>
      </div>

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
          title="Net Cash Position"
          value={formatCurrency(stats.netCash)}
          icon={TrendingUp}
          color={stats.netCash >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Pending Expense Requests"
          value={`${stats.pendingExpenseRequests} requests`}
          icon={Receipt}
          color="purple"
        />
        <StatCard
          title="Pending Expense Amount"
          value={formatCurrency(stats.pendingExpenseAmount)}
          icon={Receipt}
          color="orange"
        />
        <StatCard
          title="Completed Today"
          value={`${stats.completedToday} transactions`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Completed Today Amount"
          value={formatCurrency(stats.completedTodayAmount)}
          icon={CheckCircle}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Transactions Completed Today</p>
                <p className="text-xs text-gray-600">{formatCurrency(stats.completedTodayAmount)}</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Outstanding Advances</p>
                <p className="text-xs text-gray-600">{formatCurrency(stats.advanceAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

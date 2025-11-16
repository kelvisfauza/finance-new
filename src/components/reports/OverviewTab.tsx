import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, FileText, Users } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { FinanceStats, MonthlyData } from '../../hooks/useFinanceReports'
import { format } from 'date-fns'

interface OverviewTabProps {
  stats: FinanceStats
  monthlyData: MonthlyData[]
  loading: boolean
}

export const OverviewTab = ({ stats, monthlyData, loading }: OverviewTabProps) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-96 rounded-lg"></div>
      </div>
    )
  }

  const chartData = monthlyData.map(item => ({
    month: format(new Date(item.month + '-01'), 'MMM yyyy'),
    Expenses: item.expenses,
    'HR/Salary': item.hrSalary,
    Requisitions: item.requisitions,
    'Coffee Payments': item.coffeePayments
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total HR/Salary</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalHRSalary)}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-500 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Requisitions</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRequisitions)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Coffee Payments</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCoffeePayments)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Expenses" fill="#3b82f6" />
            <Bar dataKey="HR/Salary" fill="#10b981" />
            <Bar dataKey="Requisitions" fill="#f59e0b" />
            <Bar dataKey="Coffee Payments" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const Receipt = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

import { Calendar } from 'lucide-react'

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  department: string
  status: string
}

interface ReportFiltersProps {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
  departments: string[]
}

const QUICK_PERIODS = [
  { label: 'Today', days: 0 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'This Year', days: 365 },
  { label: 'All', days: null }
]

const STATUSES = ['All', 'Approved', 'Pending', 'Rejected']

export const ReportFiltersComponent = ({ filters, onChange, departments }: ReportFiltersProps) => {
  const handleQuickPeriod = (days: number | null) => {
    if (days === null) {
      onChange({ ...filters, dateFrom: '', dateTo: '' })
    } else {
      const today = new Date()
      const from = new Date(today)
      from.setDate(today.getDate() - days)

      onChange({
        ...filters,
        dateFrom: from.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0]
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date From
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date To
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 mr-2">Quick periods:</span>
        {QUICK_PERIODS.map((period) => (
          <button
            key={period.label}
            onClick={() => handleQuickPeriod(period.days)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  )
}

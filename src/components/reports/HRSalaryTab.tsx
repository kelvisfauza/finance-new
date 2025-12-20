import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ReportFilters } from './ReportFilters'
import { formatCurrency } from '../../lib/utils'
import { format } from 'date-fns'
import { Users, TrendingUp, Printer } from 'lucide-react'

interface SalaryRecord {
  id: string
  employeeName: string
  requestType: string
  title: string
  amount: number
  dateRequested: string
  financeApprovedAt: string
  financeApprovedBy: string
  status: string
  department: string
}

interface HRSalaryTabProps {
  filters: ReportFilters
}

export const HRSalaryTab = ({ filters }: HRSalaryTabProps) => {
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, count: 0 })

  useEffect(() => {
    fetchSalaryRecords()
  }, [filters])

  const fetchSalaryRecords = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('approval_requests')
        .select('*')
        .not('finance_approved_at', 'is', null)

      if (filters.dateFrom) {
        query = query.gte('finance_approved_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('finance_approved_at', filters.dateTo)
      }
      if (filters.department) {
        query = query.eq('department', filters.department)
      }
      if (filters.status !== 'All') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      const salaryRecords: SalaryRecord[] = []

      data?.forEach((req: any) => {
        const isSalary = req.type === 'salary' ||
          req.type === 'wage' ||
          req.type === 'Employee Salary Request' ||
          req.type === 'Salary Payment'

        if (isSalary) {
          salaryRecords.push({
            id: req.id,
            employeeName: req.requestedby_name || req.requestedby || 'N/A',
            requestType: req.type,
            title: req.title || req.description || 'N/A',
            amount: Number(req.amount),
            dateRequested: req.daterequested,
            financeApprovedAt: req.finance_approved_at,
            financeApprovedBy: req.finance_approved_by,
            status: req.status,
            department: req.department || 'N/A'
          })
        }
      })

      salaryRecords.sort((a, b) => {
        const dateA = a.financeApprovedAt ? new Date(a.financeApprovedAt).getTime() : 0
        const dateB = b.financeApprovedAt ? new Date(b.financeApprovedAt).getTime() : 0
        return dateB - dateA
      })

      const total = salaryRecords.reduce((sum, rec) => sum + rec.amount, 0)

      setRecords(salaryRecords)
      setStats({ total, count: salaryRecords.length })
    } catch (error) {
      console.error('Error fetching salary records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      return format(date, 'MMM d, yyyy')
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-96 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden flex justify-end mb-4">
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Salary Payouts</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Requests</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finance Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.employeeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.requestType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {record.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.dateRequested)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>
                      <div>{record.financeApprovedBy || 'N/A'}</div>
                      <div className="text-xs">
                        {formatDate(record.financeApprovedAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      record.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

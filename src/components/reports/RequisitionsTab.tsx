import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ReportFilters } from './ReportFilters'
import { formatCurrency } from '../../lib/utils'
import { format } from 'date-fns'
import { FileText, TrendingUp, Printer } from 'lucide-react'

interface RequisitionRecord {
  id: string
  dateRequested: string
  title: string
  department: string
  amount: number
  status: string
  adminApprovedAt?: string
  adminApprovedBy?: string
  financeApprovedAt: string
  financeApprovedBy: string
}

interface RequisitionsTabProps {
  filters: ReportFilters
}

export const RequisitionsTab = ({ filters }: RequisitionsTabProps) => {
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, count: 0 })
  const [deptSummary, setDeptSummary] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    fetchRequisitions()
  }, [filters])

  const fetchRequisitions = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('approval_requests')
        .select('*')
        .not('finance_approved_at', 'is', null)

      if (filters.dateFrom) {
        const dateStart = `${filters.dateFrom}T00:00:00`
        query = query.gte('finance_approved_at', dateStart)
      }
      if (filters.dateTo) {
        const dateEnd = `${filters.dateTo}T23:59:59`
        query = query.lte('finance_approved_at', dateEnd)
      }
      if (filters.department) {
        query = query.eq('department', filters.department)
      }
      if (filters.status !== 'All') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      const requisitionRecords: RequisitionRecord[] = []
      const deptTotals: { [key: string]: number } = {}

      data?.forEach((req: any) => {
        const isRequisition = req.type === 'requisition' || req.type === 'Requisition'

        if (isRequisition) {
          const amount = Number(req.amount)
          const dept = req.department || 'N/A'

          requisitionRecords.push({
            id: req.id,
            dateRequested: req.daterequested,
            title: req.title || req.description || 'N/A',
            department: dept,
            amount,
            status: req.status,
            adminApprovedAt: req.admin_approved_at,
            adminApprovedBy: req.admin_approved_by,
            financeApprovedAt: req.finance_approved_at,
            financeApprovedBy: req.finance_approved_by
          })

          deptTotals[dept] = (deptTotals[dept] || 0) + amount
        }
      })

      requisitionRecords.sort((a, b) => {
        const dateA = a.financeApprovedAt ? new Date(a.financeApprovedAt).getTime() : 0
        const dateB = b.financeApprovedAt ? new Date(b.financeApprovedAt).getTime() : 0
        return dateB - dateA
      })

      const total = requisitionRecords.reduce((sum, req) => sum + req.amount, 0)

      setRequisitions(requisitionRecords)
      setStats({ total, count: requisitionRecords.length })
      setDeptSummary(deptTotals)
    } catch (error) {
      console.error('Error fetching requisitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
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
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Amount</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Requisitions</h3>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </div>
      </div>

      {Object.keys(deptSummary).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Department</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(deptSummary).map(([dept, total]) => (
              <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{dept}</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Requested
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finance Approved
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requisitions.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {req.dateRequested ? format(new Date(req.dateRequested), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {req.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {req.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(req.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {req.adminApprovedBy && req.adminApprovedAt ? (
                      <div>
                        <div>{req.adminApprovedBy}</div>
                        <div className="text-xs">{format(new Date(req.adminApprovedAt), 'MMM d, yyyy')}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>
                      <div>{req.financeApprovedBy || 'N/A'}</div>
                      <div className="text-xs">
                        {req.financeApprovedAt ? format(new Date(req.financeApprovedAt), 'MMM d, yyyy') : 'N/A'}
                      </div>
                    </div>
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

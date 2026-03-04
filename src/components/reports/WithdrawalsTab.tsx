import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ReportFilters } from './ReportFilters'
import { formatCurrency } from '../../lib/utils'
import { format } from 'date-fns'
import { Banknote, TrendingUp, Printer, CheckCircle, XCircle, Clock } from 'lucide-react'

interface WithdrawalRecord {
  id: string
  employeeName: string
  employeeId: string
  amount: number
  paymentMethod: string
  phoneNumber: string | null
  bankName: string | null
  accountNumber: string | null
  status: string
  dateRequested: string
  hrApprovedAt: string | null
  adminApprovedAt: string | null
  financeApprovedAt: string | null
  payoutStatus: string | null
  payoutError: string | null
  payoutCompletedAt: string | null
}

interface WithdrawalsTabProps {
  filters: ReportFilters
}

export const WithdrawalsTab = ({ filters }: WithdrawalsTabProps) => {
  const [records, setRecords] = useState<WithdrawalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    completed: 0,
    pending: 0,
    failed: 0
  })

  useEffect(() => {
    fetchWithdrawalRecords()
  }, [filters])

  const fetchWithdrawalRecords = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('money_requests')
        .select('*')
        .eq('request_type', 'withdrawal')
        .order('created_at', { ascending: false })

      if (filters.dateFrom) {
        const dateStart = `${filters.dateFrom}T00:00:00`
        query = query.gte('created_at', dateStart)
      }
      if (filters.dateTo) {
        const dateEnd = `${filters.dateTo}T23:59:59`
        query = query.lte('created_at', dateEnd)
      }
      if (filters.status !== 'All') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      const withdrawalRecords: WithdrawalRecord[] = data?.map((req: any) => ({
        id: req.id,
        employeeName: req.employee_name || 'N/A',
        employeeId: req.employee_id,
        amount: Number(req.amount),
        paymentMethod: req.payment_method || 'N/A',
        phoneNumber: req.phone_number,
        bankName: req.bank_name,
        accountNumber: req.account_number,
        status: req.status,
        dateRequested: req.created_at,
        hrApprovedAt: req.hr_approved_at,
        adminApprovedAt: req.admin_approved_at,
        financeApprovedAt: req.finance_approved_at,
        payoutStatus: req.payout_status,
        payoutError: req.payout_error,
        payoutCompletedAt: req.payout_completed_at
      })) || []

      const total = withdrawalRecords.reduce((sum, rec) => sum + rec.amount, 0)
      const completed = withdrawalRecords.filter(r => r.status === 'finance_approved' && r.payoutStatus === 'completed').length
      const pending = withdrawalRecords.filter(r => r.status === 'pending' || r.status === 'hr_approved' || r.status === 'admin_approved').length
      const failed = withdrawalRecords.filter(r => r.payoutStatus === 'failed').length

      setRecords(withdrawalRecords)
      setStats({ total, count: withdrawalRecords.length, completed, pending, failed })
    } catch (error) {
      console.error('Error fetching withdrawal records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      'pending': { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      'hr_approved': { label: 'HR Approved', className: 'bg-blue-100 text-blue-800' },
      'admin_approved': { label: 'Admin Approved', className: 'bg-indigo-100 text-indigo-800' },
      'finance_approved': { label: 'Finance Approved', className: 'bg-green-100 text-green-800' },
      'rejected': { label: 'Rejected', className: 'bg-red-100 text-red-800' }
    }

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getPayoutBadge = (payoutStatus: string | null) => {
    if (!payoutStatus) return null

    const statusMap: { [key: string]: { label: string; className: string; icon: any } } = {
      'completed': { label: 'Paid', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'failed': { label: 'Failed', className: 'bg-red-100 text-red-800', icon: XCircle },
      'pending': { label: 'Processing', className: 'bg-yellow-100 text-yellow-800', icon: Clock }
    }

    const statusInfo = statusMap[payoutStatus] || { label: payoutStatus, className: 'bg-gray-100 text-gray-800', icon: Clock }
    const Icon = statusInfo.icon

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.className}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Banknote className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Withdrawals</p>
              <p className="text-xl font-bold text-gray-900">{stats.count}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      <div className="hidden print:block mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Statement</h2>
        <p className="text-gray-600">
          {filters.dateFrom && filters.dateTo
            ? `Period: ${format(new Date(filters.dateFrom), 'MMM dd, yyyy')} - ${format(new Date(filters.dateTo), 'MMM dd, yyyy')}`
            : 'All Time'}
        </p>
        <p className="text-gray-600 mt-1">
          Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Withdrawals:</p>
            <p className="font-bold">{stats.count}</p>
          </div>
          <div>
            <p className="text-gray-600">Completed:</p>
            <p className="font-bold text-green-700">{stats.completed}</p>
          </div>
          <div>
            <p className="text-gray-600">Pending:</p>
            <p className="font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Amount:</p>
            <p className="font-bold">{formatCurrency(stats.total)}</p>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No withdrawal records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Payment Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Payout Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Completed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(record.dateRequested), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
                      <div className="text-xs text-gray-500">{record.employeeId}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 print:hidden">
                    {record.paymentMethod === 'Mobile Money' && record.phoneNumber && (
                      <div className="text-xs">{record.phoneNumber}</div>
                    )}
                    {record.paymentMethod === 'Bank' && (
                      <div className="text-xs">
                        <div>{record.bankName}</div>
                        <div className="text-gray-500">{record.accountNumber}</div>
                      </div>
                    )}
                    {record.paymentMethod === 'Cash' && (
                      <div className="text-xs text-gray-500">Cash pickup</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3 text-sm print:hidden">
                    <div className="flex items-center gap-2">
                      {getPayoutBadge(record.payoutStatus)}
                      {record.payoutError && (
                        <div className="text-xs text-red-600" title={record.payoutError}>
                          Error
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 print:hidden">
                    {record.payoutCompletedAt
                      ? format(new Date(record.payoutCompletedAt), 'MMM dd, HH:mm')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">
                  {formatCurrency(stats.total)}
                </td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Users, Download, Search, CheckCircle, Clock } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface SalaryPayment {
  id: string
  user_id: string
  amount: number
  request_type: string
  reason: string
  status: string
  requested_by: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  finance_approved_at: string | null
  finance_approved_by: string | null
  admin_approved_at: string | null
  admin_approved_by: string | null
  approval_stage: string
  payment_slip_generated: boolean
  payment_slip_number: string | null
  created_at: string
  updated_at: string
}

export const HRPayments = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPayments(data || [])
    } catch (error: any) {
      console.error('Error fetching salary payments:', error)
      alert('Failed to fetch salary payments')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    if (statusFilter) {
      filtered = filtered.filter(payment => payment.status.toLowerCase() === statusFilter.toLowerCase())
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.request_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.requested_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPayments(filtered)
  }

  const handleExport = () => {
    const exportData = filteredPayments.map(payment => ({
      'Request Type': payment.request_type,
      Amount: payment.amount,
      Reason: payment.reason,
      'Requested By': payment.requested_by,
      Status: payment.status,
      'Approval Stage': payment.approval_stage,
      'Finance Approved By': payment.finance_approved_by || 'N/A',
      'Finance Approved At': payment.finance_approved_at ? formatDate(payment.finance_approved_at) : 'N/A',
      'Admin Approved By': payment.admin_approved_by || 'N/A',
      'Admin Approved At': payment.admin_approved_at ? formatDate(payment.admin_approved_at) : 'N/A',
      'Created At': formatDate(payment.created_at)
    }))
    exportToCSV(exportData, `hr-payments-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salary payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Payment Requests</h1>
          <p className="text-gray-600">Review and process salary and advance payment requests</p>
        </div>
        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Export
          </button>
        </PermissionGate>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by month or processor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Request Type</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Requested By</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Approval Stage</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No salary payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  return (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{payment.request_type}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(Number(payment.amount))}</td>
                      <td className="py-3 px-4 text-sm">{payment.reason}</td>
                      <td className="py-3 px-4 text-sm">{payment.requested_by}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {payment.approval_stage?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status.toLowerCase() === 'completed' || payment.status.toLowerCase() === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : payment.status.toLowerCase() === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status.toLowerCase() === 'completed' || payment.status.toLowerCase() === 'approved' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>{formatDate(payment.created_at)}</div>
                        {payment.finance_approved_at && (
                          <div className="text-gray-500 text-xs">
                            Finance: {formatDate(payment.finance_approved_at)}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  payments
                    .filter(p => p.status.toLowerCase() === 'pending')
                    .reduce((sum, p) => sum + Number(p.amount), 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status.toLowerCase() === 'completed' || p.status.toLowerCase() === 'approved').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

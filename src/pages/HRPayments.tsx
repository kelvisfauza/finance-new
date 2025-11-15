import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Users, Download, Search, CheckCircle, Clock, Check, X, Printer } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'
import { useSMSNotifications } from '../hooks/useSMSNotifications'
import { useAuth } from '../contexts/AuthContext'
import { PayslipPrint } from '../components/PayslipPrint'

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
  employee_name?: string
  employee_phone?: string
  employee_position?: string
}

export const HRPayments = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [printingPayment, setPrintingPayment] = useState<SalaryPayment | null>(null)
  const [employeeDetails, setEmployeeDetails] = useState<any>(null)

  const { sendApprovalResponseSMS } = useSMSNotifications()
  const { user } = useAuth()

  useEffect(() => {
    fetchPayments()

    const interval = setInterval(() => {
      fetchPayments()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const fetchPayments = async () => {
    try {
      if (initialLoad) {
        setLoading(true)
      }

      let query = supabase
        .from('money_requests')
        .select('*')

      query = query
        .eq('admin_approved', true)
        .eq('finance_approved', false)
        .eq('status', 'Pending Finance')

      const { data: paymentsData, error: paymentsError } = await query
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      if (paymentsData && paymentsData.length > 0) {
        const userIds = paymentsData.map((p: any) => p.user_id).filter(Boolean)

        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('auth_user_id, name, phone, position')
          .in('auth_user_id', userIds)

        if (empError) {
          console.error('Error fetching employee names:', empError)
        }

        type EmployeeInfo = { name: string; phone: string; position: string }
        const employeeMap = new Map<string, EmployeeInfo>(
          employees?.map((emp: any) => [emp.auth_user_id, { name: emp.name, phone: emp.phone, position: emp.position }]) || []
        )

        const enrichedPayments = paymentsData.map((payment: any) => ({
          ...payment,
          employee_name: employeeMap.get(payment.user_id)?.name || payment.requested_by,
          employee_phone: employeeMap.get(payment.user_id)?.phone,
          employee_position: employeeMap.get(payment.user_id)?.position
        }))

        setPayments(enrichedPayments)
      } else {
        setPayments([])
      }
    } catch (error: any) {
      console.error('Error fetching salary payments:', error)
      if (initialLoad) {
        alert('Failed to fetch salary payments')
      }
    } finally {
      if (initialLoad) {
        setLoading(false)
        setInitialLoad(false)
      }
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
        payment.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.requested_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPayments(filtered)
  }

  const handleApprove = async (payment: SalaryPayment) => {
    if (processingId) return

    try {
      setProcessingId(payment.id)

      const { error: updateError } = await supabase
        .from('money_requests')
        .update({
          status: 'Approved',
          finance_approved: true,
          finance_approved_at: new Date().toISOString(),
          finance_approved_by: user?.email || 'Finance',
          approval_stage: 'finance_approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          payment_type: payment.request_type,
          amount: payment.amount,
          employee_id: payment.user_id,
          description: payment.reason,
          money_request_id: payment.id,
          created_at: new Date().toISOString()
        })

      if (paymentError) throw paymentError

      const { error: cashError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          type: 'salary',
          amount: payment.amount,
          description: `${payment.request_type}: ${payment.reason}`,
          reference: payment.id,
          created_by: user?.email || 'Finance',
          created_at: new Date().toISOString()
        })

      if (cashError) throw cashError

      const employeeName = payment.employee_name || payment.requested_by
      const employeePhone = payment.employee_phone

      if (employeePhone) {
        await sendApprovalResponseSMS(
          employeeName,
          employeePhone,
          payment.amount,
          'approved',
          user?.email || 'Finance',
          payment.request_type
        )
      }

      await fetchPayments()
      alert('Payment approved and processed successfully')
    } catch (error: any) {
      console.error('Error approving payment:', error)
      alert('Failed to approve payment request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (payment: SalaryPayment) => {
    if (processingId) return

    const reason = prompt('Please enter rejection reason:')
    if (!reason) return

    try {
      setProcessingId(payment.id)

      const { error } = await supabase
        .from('money_requests')
        .update({
          status: 'Rejected',
          finance_approved: false,
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (error) throw error

      const employeeName = payment.employee_name || payment.requested_by
      const employeePhone = payment.employee_phone

      if (employeePhone) {
        await sendApprovalResponseSMS(
          employeeName,
          employeePhone,
          payment.amount,
          'rejected',
          user?.email || 'Admin',
          payment.request_type
        )
      }

      await fetchPayments()
      alert('Payment request rejected')
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      alert('Failed to reject payment request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const exportData = filteredPayments.map(payment => ({
      'Request Type': payment.request_type,
      Amount: payment.amount,
      Reason: payment.reason,
      'Requested By': payment.employee_name || payment.requested_by,
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
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
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
                      <td className="py-3 px-4">
                        {payment.employee_name ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.employee_name}</div>
                            {payment.employee_position && (
                              <div className="text-xs text-gray-500">{payment.employee_position}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{payment.requested_by}</span>
                        )}
                      </td>
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
                      <td className="py-3 px-4">
                        {payment.status.toLowerCase() === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(payment)}
                              disabled={processingId === payment.id}
                              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(payment)}
                              disabled={processingId === payment.id}
                              className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        ) : payment.status.toLowerCase() === 'approved' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                const { data: profile } = await supabase
                                  .from('employees')
                                  .select('name, phone, email')
                                  .eq('auth_user_id', payment.user_id)
                                  .maybeSingle()

                                setEmployeeDetails({
                                  name: payment.employee_name || profile?.name || payment.requested_by,
                                  phone: payment.employee_phone || profile?.phone,
                                  email: profile?.email || payment.requested_by
                                })
                                setPrintingPayment(payment)
                              }}
                              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-gray-400">
                            {payment.status.toLowerCase() === 'rejected' ? 'Rejected' : 'Completed'}
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

      {printingPayment && (
        <PayslipPrint
          payment={printingPayment}
          employeeDetails={employeeDetails}
          onClose={() => {
            setPrintingPayment(null)
            setEmployeeDetails(null)
          }}
        />
      )}
    </div>
  )
}

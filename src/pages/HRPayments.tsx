import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Users, Download, Search, CheckCircle, Clock, Check, X, Printer } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'
import { useSMSNotifications } from '../hooks/useSMSNotifications'
import { useAuth } from '../contexts/AuthContext'
import { PayslipPrint } from '../components/PayslipPrint'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

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
  const [showApproved, setShowApproved] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [printingPayment, setPrintingPayment] = useState<SalaryPayment | null>(null)
  const [employeeDetails, setEmployeeDetails] = useState<any>(null)

  const { sendApprovalResponseSMS } = useSMSNotifications()
  const { user, employee } = useAuth()

  const isFinanceRole = employee?.role?.toLowerCase().includes('finance') ||
    employee?.permissions?.includes('Finance') ||
    employee?.permissions?.includes('Finance Management') ||
    employee?.permissions?.includes('Finance Approval') ||
    employee?.permissions?.some((p: string) => p.startsWith('Finance:'))
  const isAdminRole = ['Super Admin', 'Administrator', 'Manager'].includes(employee?.role || '')

  const getDisplayStage = (payment: SalaryPayment) => {
    if (isFinanceRole && payment.approval_stage === 'pending_finance') {
      return 'Ready for Review'
    }
    return payment.approval_stage?.replace('_', ' ')
  }

  const getDisplayStatus = (payment: SalaryPayment) => {
    if (isFinanceRole && payment.status === 'Pending Finance') {
      return 'Ready for Review'
    }
    return payment.status
  }

  const fetchPayments = useCallback(async () => {
    try {
      if (initialLoad) {
        setLoading(true)
      }

      // Fetch from money_requests table (old system)
      let moneyQuery = supabase
        .from('money_requests')
        .select('*')

      if (showApproved) {
        moneyQuery = moneyQuery.eq('finance_approved', true)
      } else {
        moneyQuery = moneyQuery
          .eq('finance_approved', false)
          .in('status', ['approved', 'Approved', 'Pending Finance'])
      }

      const { data: moneyData, error: moneyError } = await moneyQuery.order('created_at', { ascending: false })

      if (moneyError) throw moneyError

      // Fetch from approval_requests table (new system)
      let approvalQuery = supabase
        .from('approval_requests')
        .select('*')
        .in('type', ['Salary Request', 'Wage Request', 'Employee Salary Request', 'Salary Advance'])
        .eq('admin_approved', true)

      if (showApproved) {
        approvalQuery = approvalQuery.eq('finance_approved', true)
      } else {
        approvalQuery = approvalQuery
          .eq('finance_approved', false)
          .in('status', ['Pending Finance', 'Pending'])
      }

      const { data: approvalData, error: approvalError } = await approvalQuery.order('created_at', { ascending: false })

      if (approvalError) throw approvalError

      // Combine both data sources and sort by created_at (most recent first)
      const allPayments = [...(moneyData || []), ...(approvalData || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (allPayments.length > 0) {
        const userIds = allPayments.map((p: any) => p.user_id).filter(Boolean)
        const requestedByEmails = allPayments
          .filter((p: any) => p.requestedby)
          .map((p: any) => p.requestedby)

        // Fetch employee info by both user_id and email
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('auth_user_id, email, name, phone, position')

        if (empError) {
          console.error('Error fetching employee names:', empError)
        }

        type EmployeeInfo = { name: string; phone: string; position: string }
        const employeeMapById = new Map<string, EmployeeInfo>(
          employees?.map((emp: any) => [emp.auth_user_id, { name: emp.name, phone: emp.phone, position: emp.position }]) || []
        )
        const employeeMapByEmail = new Map<string, EmployeeInfo>(
          employees?.map((emp: any) => [emp.email, { name: emp.name, phone: emp.phone, position: emp.position }]) || []
        )

        const enrichedPayments = allPayments.map((payment: any) => {
          const empInfo = employeeMapById.get(payment.user_id) || employeeMapByEmail.get(payment.requestedby)
          return {
            ...payment,
            employee_name: empInfo?.name || payment.requested_by || payment.requestedby,
            employee_phone: empInfo?.phone,
            employee_position: empInfo?.position,
            request_type: payment.request_type || payment.type,
            reason: payment.reason || payment.title
          }
        })

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
  }, [showApproved, initialLoad])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useRealtimeSubscription(['payment_records', 'approval_requests'], fetchPayments)

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

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

      // Determine which table this payment came from
      const tableName = payment.user_id ? 'money_requests' : 'approval_requests'

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: 'Approved',
          finance_approved: true,
          finance_approved_at: new Date().toISOString(),
          finance_approved_by: employee?.name || user?.email || 'Finance',
          approval_stage: 'finance_approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw new Error(`Failed to update approval: ${updateError.message}`)
      }

      // Get current cash balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .single()

      if (balanceError) {
        console.error('Balance fetch error:', balanceError)
        throw new Error(`Failed to fetch cash balance: ${balanceError.message}`)
      }

      const currentBalance = parseFloat(balanceData.current_balance)
      const paymentAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount
      const balanceAfter = currentBalance - paymentAmount

      // Record cash transaction
      const { error: cashError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'salary',
          amount: paymentAmount,
          balance_after: balanceAfter,
          notes: `${payment.request_type}: ${payment.reason}`,
          reference: payment.id,
          created_by: user?.email || 'Finance',
          created_at: new Date().toISOString(),
          status: 'confirmed'
        })

      if (cashError) {
        console.error('Cash transaction error details:', cashError)
        throw new Error(`Failed to record cash transaction: ${cashError.message}`)
      }

      // Update cash balance
      const { error: updateBalanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: balanceAfter,
          last_updated: new Date().toISOString(),
          updated_by: user?.email || 'Finance'
        })
        .eq('singleton', true)

      if (updateBalanceError) {
        console.error('Balance update error:', updateBalanceError)
        throw new Error(`Failed to update cash balance: ${updateBalanceError.message}`)
      }

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
      alert(`Failed to approve payment request: ${error.message || 'Unknown error'}`)
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

      // Determine which table this payment came from
      const tableName = payment.user_id ? 'money_requests' : 'approval_requests'

      const { error } = await supabase
        .from(tableName)
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

  const handlePrint = async (payment: SalaryPayment) => {
    const formattedAmount = formatCurrency(payment.amount)

    // Convert logo to base64
    let logoBase64 = ''
    try {
      const response = await fetch('/gpcf-logo copy.png')
      const blob = await response.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error loading logo:', error)
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Voucher - ${payment.employee_name || payment.requested_by}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            font-size: 12px;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 2px solid #8B4513;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .header img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .header-text {
            flex: 1;
          }
          .header h1 {
            margin: 0;
            color: #8B4513;
            font-size: 18px;
            font-weight: bold;
          }
          .header .subtitle {
            font-size: 10px;
            color: #666;
            margin: 2px 0;
          }
          .document-type {
            text-align: center;
            color: #333;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            background: #f5f5f5;
            padding: 6px 15px;
            border-radius: 4px;
            margin-bottom: 12px;
          }
          .voucher-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .info-section {
            flex: 1;
          }
          .info-row {
            margin: 4px 0;
            font-size: 11px;
          }
          .label {
            font-weight: bold;
            color: #333;
          }
          .value {
            color: #666;
          }
          .amount-section {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
            text-align: center;
          }
          .amount {
            font-size: 24px;
            font-weight: bold;
            color: #8B4513;
          }
          .details-section {
            margin: 12px 0;
          }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
          }
          .signature-box {
            text-align: center;
            flex: 1;
            margin: 0 10px;
          }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 25px;
            padding-top: 6px;
            font-size: 11px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #999;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
          }
          @media print {
            body {
              padding: 15px;
            }
            .no-print {
              display: none;
            }
            @page {
              margin: 15mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Great Pearl Coffee Finance Logo">` : ''}
          <div class="header-text">
            <h1>GREAT PEARL COFFEE FINANCE</h1>
            <div class="subtitle">Kasese, Uganda | www.greatpearlcoffee.com</div>
            <div class="subtitle">Tel: +256 781 121 639 | Email: info@greatpearlcoffee.com</div>
          </div>
        </div>
        <div class="document-type">HR Payment Voucher</div>

        <div class="voucher-info">
          <div class="info-section">
            <div class="info-row">
              <span class="label">Voucher No:</span>
              <span class="value">#${payment.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Type:</span>
              <span class="value">${payment.request_type}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value" style="color: #16a34a; font-weight: bold;">${payment.status}</span>
            </div>
          </div>
        </div>

        <div class="details-section">
          <div class="section-title">Payment Details</div>
          <div class="info-row">
            <span class="label">Employee Name:</span>
            <span class="value">${payment.employee_name || payment.requested_by}</span>
          </div>
          ${payment.employee_position ? `
          <div class="info-row">
            <span class="label">Position:</span>
            <span class="value">${payment.employee_position}</span>
          </div>
          ` : ''}
          ${payment.employee_phone ? `
          <div class="info-row">
            <span class="label">Phone:</span>
            <span class="value">${payment.employee_phone}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Reason:</span>
            <span class="value">${payment.reason || 'N/A'}</span>
          </div>
        </div>

        <div class="amount-section">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">AMOUNT TO BE PAID</div>
          <div class="amount">${formattedAmount}</div>
        </div>

        <div class="details-section">
          <div class="section-title">Approval Process</div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #f97316;">
            <div style="margin-bottom: 15px;">
              <strong style="color: #f97316; font-size: 14px;">STEP 1: ADMIN APPROVAL</strong>
              ${payment.admin_approved_by ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${payment.admin_approved_by}</span>
                </div>
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${payment.admin_approved_at ? new Date(payment.admin_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 8px;">Pending Admin Approval</div>'}
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
              <strong style="color: #f97316; font-size: 14px;">STEP 2: FINANCE APPROVAL</strong>
              ${payment.finance_approved_by ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${payment.finance_approved_by}</span>
                </div>
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${payment.finance_approved_at ? new Date(payment.finance_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 8px;">Pending Finance Approval</div>'}
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">
              <strong>Received By</strong><br>
              <span style="font-size: 10px;">${payment.employee_name || payment.requested_by}</span><br>
              <span style="font-size: 10px;">Signature & Date</span>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>Authorized By</strong><br>
              <span style="font-size: 10px;">Finance Department</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 2px 0;">Computer-generated document | Printed: ${new Date().toLocaleDateString()}</p>
          <p style="margin: 2px 0;">Great Pearl Coffee Finance - Finance Management System</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Print Voucher</button>
          <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `

    // Create a hidden iframe to print
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(htmlContent)
      doc.close()

      // Wait for content to load, then print
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 500)
    }
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
          <div>
            <button
              onClick={() => setShowApproved(!showApproved)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showApproved
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showApproved ? 'Show Pending' : 'Show Approved'}
            </button>
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
                          {getDisplayStage(payment)}
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
                          {getDisplayStatus(payment)}
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
                        {!showApproved && (payment.status === 'Pending Finance' || payment.status === 'pending') && isFinanceRole ? (
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
                        ) : showApproved || payment.status.toLowerCase() === 'approved' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrint(payment)}
                              className="flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Voucher
                            </button>
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
                              Payslip
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

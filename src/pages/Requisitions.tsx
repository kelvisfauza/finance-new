import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { FileText, CheckCircle, Clock, XCircle, Download, Search, Printer } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'
import { useAuth } from '../contexts/AuthContext'
import { useEmployeesByEmail } from '../hooks/useEmployeesByEmail'
import { useFinanceNotifications } from '../hooks/useFinanceNotifications'

interface Requisition {
  id: string
  type: string
  title: string
  description?: string
  amount: number
  date?: string
  daterequested: string
  category?: string
  status: string
  priority: string
  department: string
  requestedby: string
  created_at: string
  updated_at?: string
  details?: any
  finance_approved?: boolean
  finance_approved_by?: string
  finance_approved_at?: string
  admin_approved?: boolean
  admin_approved_by?: string
  admin_approved_at?: string
  approval_stage?: string
}

export const Requisitions = () => {
  const { employee } = useAuth()
  const { createNotification } = useFinanceNotifications()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [filteredRequisitions, setFilteredRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [actionType, setActionType] = useState<'finance-review' | 'admin-approve' | 'reject'>('admin-approve')

  const isFinanceRole = employee?.role?.toLowerCase().includes('finance') ||
    employee?.permissions?.includes('Finance') ||
    employee?.permissions?.includes('Finance Management') ||
    employee?.permissions?.includes('Finance Approval')
  const isAdminRole = ['Super Admin', 'Administrator', 'Manager'].includes(employee?.role || '')

  const allEmails = useMemo(() => {
    const emails: string[] = []
    requisitions.forEach(req => {
      if (req.requestedby) emails.push(req.requestedby)
      if (req.finance_approved_by) emails.push(req.finance_approved_by)
      if (req.admin_approved_by) emails.push(req.admin_approved_by)
    })
    return emails
  }, [requisitions])

  const { getEmployee } = useEmployeesByEmail(allEmails)

  useEffect(() => {
    fetchRequisitions()

    const interval = setInterval(() => {
      fetchRequisitions()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterRequisitions()
  }, [requisitions, searchTerm, statusFilter])

  const fetchRequisitions = async () => {
    try {
      if (initialLoad) {
        setLoading(true)
      }

      let query = supabase
        .from('approval_requests')
        .select('*')
        .in('type', ['Requisition', 'Cash Requisition'])

      if (isFinanceRole) {
        query = query
          .eq('admin_approved', true)
          .in('status', ['Pending Finance', 'Approved'])
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setRequisitions(data || [])
    } catch (error: any) {
      console.error('Error fetching requisitions:', error)
      if (initialLoad) {
        alert('Failed to fetch requisitions')
      }
    } finally {
      if (initialLoad) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }

  const getDisplayStatus = (req: Requisition) => {
    if (req.status === 'Rejected') return 'Rejected'
    if (req.finance_approved || req.status === 'Approved') return 'Approved'
    if (req.admin_approved && !req.finance_approved) return 'Pending Finance'
    if (isFinanceRole && req.admin_approved && !req.finance_approved) return 'Ready for Review'
    return 'Pending Admin'
  }

  const filterRequisitions = () => {
    let filtered = requisitions

    if (statusFilter) {
      filtered = filtered.filter(req => {
        const displayStatus = getDisplayStatus(req)
        return displayStatus === statusFilter || req.status === statusFilter
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestedby?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRequisitions(filtered)
  }

  const handleFinanceReview = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setActionType('finance-review')
    setShowModal(true)
  }

  const handleAdminApprove = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setActionType('admin-approve')
    setShowModal(true)
  }

  const handleReject = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setActionType('reject')
    setShowModal(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedRequisition || !employee) return

    try {
      setProcessing(true)

      if (actionType === 'finance-review') {
        const { error: updateError } = await supabase
          .from('approval_requests')
          .update({
            finance_approved: true,
            finance_approved_by: employee.name,
            finance_approved_at: new Date().toISOString(),
            status: 'Approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequisition.id)

        if (updateError) throw updateError

        const { error: expenseError } = await supabase
          .from('finance_expenses')
          .insert({
            category: 'Requisition',
            description: selectedRequisition.title,
            amount: selectedRequisition.amount,
            date: new Date().toISOString().split('T')[0],
            department: selectedRequisition.department,
            approval_request_id: selectedRequisition.id
          })

        if (expenseError) throw expenseError

        const { error: cashError } = await supabase
          .from('finance_cash_transactions')
          .insert({
            type: 'expense',
            amount: selectedRequisition.amount,
            description: `Requisition: ${selectedRequisition.title}`,
            reference: selectedRequisition.id,
            created_by: employee.name,
            created_at: new Date().toISOString()
          })

        if (cashError) throw cashError

        await createNotification(
          'Requisition Approved',
          `Your requisition "${selectedRequisition.title}" for ${formatCurrency(selectedRequisition.amount)} has been approved by Finance.`,
          {
            type: 'system',
            priority: 'Medium',
            targetUserEmail: selectedRequisition.requestedby,
            metadata: {
              requisitionId: selectedRequisition.id,
              amount: selectedRequisition.amount,
              approvedBy: employee.name,
            }
          }
        )

        fetchRequisitions()
      } else if (actionType === 'admin-approve') {
        const { error: updateError } = await supabase
          .from('approval_requests')
          .update({
            admin_approved: true,
            admin_approved_by: employee.name,
            admin_approved_at: new Date().toISOString(),
            status: 'Pending Finance',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequisition.id)

        if (updateError) throw updateError

        await createNotification(
          'Requisition Approved by Admin',
          `Your requisition "${selectedRequisition.title}" for ${formatCurrency(selectedRequisition.amount)} has been approved by Admin. Awaiting Finance review.`,
          {
            type: 'system',
            priority: 'Medium',
            targetUserEmail: selectedRequisition.requestedby,
            metadata: {
              requisitionId: selectedRequisition.id,
              amount: selectedRequisition.amount,
              approvedBy: employee.name,
            }
          }
        )

        fetchRequisitions()
      } else if (actionType === 'reject') {
        const { error } = await supabase
          .from('approval_requests')
          .update({
            status: 'Rejected',
            finance_approved: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequisition.id)

        if (error) throw error

        await createNotification(
          'Requisition Rejected',
          `Your requisition "${selectedRequisition.title}" for ${formatCurrency(selectedRequisition.amount)} has been rejected by Finance.`,
          {
            type: 'system',
            priority: 'High',
            targetUserEmail: selectedRequisition.requestedby,
            metadata: {
              requisitionId: selectedRequisition.id,
              amount: selectedRequisition.amount,
              rejectedBy: employee.name,
            }
          }
        )

        fetchRequisitions()
      }

      setShowModal(false)
      setSelectedRequisition(null)
    } catch (error: any) {
      console.error('Error processing action:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredRequisitions.map(req => ({
      Title: req.title,
      Amount: req.amount,
      Status: req.status,
      Priority: req.priority,
      Department: req.department,
      RequestedBy: req.requestedby,
      DateRequested: req.daterequested
    }))
    exportToCSV(exportData, `requisitions-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  const handlePrint = (requisition: Requisition) => {
    const requester = getEmployee(requisition.requestedby)
    const financeApprover = requisition.finance_approved_by ? getEmployee(requisition.finance_approved_by) : null
    const adminApprover = requisition.admin_approved_by ? getEmployee(requisition.admin_approved_by) : null
    const formattedAmount = formatCurrency(requisition.amount)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Requisition Voucher - ${requisition.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
            background: linear-gradient(to bottom, #fff, #fef3f2);
            padding: 20px;
            border-radius: 8px 8px 0 0;
          }
          .header img {
            max-width: 120px;
            height: auto;
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 10px 0 5px 0;
            color: #f97316;
            font-size: 26px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header .subtitle {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
          }
          .header .document-type {
            margin: 10px 0 0 0;
            color: #333;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            background: #f97316;
            color: white;
            padding: 8px 20px;
            border-radius: 4px;
            display: inline-block;
          }
          .voucher-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .info-section {
            flex: 1;
          }
          .info-row {
            margin: 8px 0;
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
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #f97316;
          }
          .details-section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 60px;
          }
          .signature-box {
            text-align: center;
            flex: 1;
            margin: 0 20px;
          }
          .signature-line {
            border-top: 2px solid #333;
            margin-top: 50px;
            padding-top: 8px;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/gpcf-logo.png" alt="Great Pearl Coffee Finance Logo" onerror="this.style.display='none'">
          <h1>GREAT PEARL COFFEE FINANCE</h1>
          <div class="subtitle">Excellence in Coffee Trading & Finance</div>
          <div class="subtitle">Email: info@greatpearlcoffee.com | Phone: +256-XXX-XXXXXX</div>
          <div class="document-type">Requisition Voucher</div>
        </div>

        <div class="voucher-info">
          <div class="info-section">
            <div class="info-row">
              <span class="label">Voucher No:</span>
              <span class="value">#${requisition.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Type:</span>
              <span class="value">Requisition</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${requisition.department}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value" style="color: #16a34a; font-weight: bold;">${requisition.status}</span>
            </div>
          </div>
        </div>

        <div class="details-section">
          <div class="section-title">Requisition Details</div>
          <div class="info-row">
            <span class="label">Requested By:</span>
            <span class="value">${requester?.name || requisition.requestedby}</span>
          </div>
          ${requester?.position ? `
          <div class="info-row">
            <span class="label">Position:</span>
            <span class="value">${requester.position}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Description:</span>
            <span class="value">${requisition.title}</span>
          </div>
          ${requisition.description ? `
          <div class="info-row">
            <span class="label">Details:</span>
            <span class="value">${requisition.description}</span>
          </div>
          ` : ''}
        </div>

        <div class="amount-section">
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">AMOUNT TO BE PAID</div>
          <div class="amount">${formattedAmount}</div>
        </div>

        <div class="details-section">
          <div class="section-title">Approval Process</div>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #f97316;">
            <div style="margin-bottom: 15px;">
              <strong style="color: #f97316; font-size: 14px;">STEP 1: ADMIN APPROVAL</strong>
              ${requisition.admin_approved ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${adminApprover?.name || requisition.admin_approved_by || 'N/A'}</span>
                </div>
                ${adminApprover?.position ? `
                <div class="info-row">
                  <span class="label">Position:</span>
                  <span class="value">${adminApprover.position}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${requisition.admin_approved_at ? new Date(requisition.admin_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 8px;">Pending Admin Approval</div>'}
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
              <strong style="color: #f97316; font-size: 14px;">STEP 2: FINANCE APPROVAL</strong>
              ${requisition.finance_approved ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${financeApprover?.name || requisition.finance_approved_by || 'N/A'}</span>
                </div>
                ${financeApprover?.position ? `
                <div class="info-row">
                  <span class="label">Position:</span>
                  <span class="value">${financeApprover.position}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${requisition.finance_approved_at ? new Date(requisition.finance_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 8px;">Pending Finance Approval</div>'}
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">
              <strong>Received By</strong><br>
              <span style="font-size: 12px;">Name & Signature</span>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>Authorized By</strong><br>
              <span style="font-size: 12px;">Finance Department</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated document. Printed on ${new Date().toLocaleString()}</p>
          <p>Great Pearl Coffee Finance - Finance Management System</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Print Voucher</button>
          <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const blobUrl = URL.createObjectURL(blob)

    const printWindow = window.open(blobUrl, '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Print window blocked. Please allow popups for this site.')
      URL.revokeObjectURL(blobUrl)
      return
    }

    printWindow.onload = () => {
      URL.revokeObjectURL(blobUrl)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Requisitions & Cash Requests</h1>
          <p className="text-gray-600">Review and approve purchase requisitions and cash requests</p>
        </div>
        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
                placeholder="Search by title, department, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="Pending Admin">Pending Admin</option>
              <option value="Pending Finance">Pending Finance</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Requested By</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No requisitions found
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((requisition) => (
                  <tr key={requisition.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{requisition.title}</td>
                    <td className="py-3 px-4">{requisition.department}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const requester = getEmployee(requisition.requestedby)
                        return requester ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{requester.name}</div>
                            <div className="text-xs text-gray-500">{requester.position}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{requisition.requestedby}</span>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        requisition.priority === 'Urgent'
                          ? 'bg-red-100 text-red-800'
                          : requisition.priority === 'High'
                          ? 'bg-orange-100 text-orange-800'
                          : requisition.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {requisition.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(requisition.amount)}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const displayStatus = getDisplayStatus(requisition)
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            displayStatus === 'Approved'
                              ? 'bg-green-100 text-green-800'
                              : displayStatus === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : displayStatus === 'Pending Finance'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {displayStatus === 'Approved' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : displayStatus === 'Rejected' ? (
                              <XCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1" />
                            )}
                            {displayStatus}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-4 text-sm">{requisition.daterequested}</td>
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const displayStatus = getDisplayStatus(requisition)

                        if (displayStatus === 'Approved') {
                          return (
                            <button
                              onClick={() => handlePrint(requisition)}
                              className="flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Print
                            </button>
                          )
                        }

                        if (displayStatus === 'Rejected') {
                          return null
                        }

                        if (displayStatus === 'Pending Admin') {
                          return (
                            <div className="flex justify-center gap-2">
                              {isAdminRole && (
                                <>
                                  <button
                                    onClick={() => handleAdminApprove(requisition)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(requisition)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        }

                        if (displayStatus === 'Pending Finance' || displayStatus === 'Ready for Review') {
                          return (
                            <div className="flex justify-center gap-2">
                              {isFinanceRole && (
                                <>
                                  <button
                                    onClick={() => handleFinanceReview(requisition)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Final Approve & Release Cash
                                  </button>
                                  <button
                                    onClick={() => handleReject(requisition)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        }

                        return null
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className={`px-6 py-4 rounded-t-2xl ${
              actionType === 'finance-review'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                : actionType === 'admin-approve'
                ? 'bg-gradient-to-r from-green-600 to-green-700'
                : 'bg-gradient-to-r from-red-600 to-red-700'
            }`}>
              <h3 className="text-xl font-semibold text-white">
                {actionType === 'finance-review' && 'Finance Review'}
                {actionType === 'admin-approve' && 'Final Approval & Release Cash'}
                {actionType === 'reject' && 'Reject Requisition'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Title</p>
                    <p className="font-semibold">{selectedRequisition.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Department</p>
                    <p className="font-semibold">{selectedRequisition.department}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Requested By</p>
                    <p className="font-semibold">{selectedRequisition.requestedby}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Priority</p>
                    <p className="font-semibold">{selectedRequisition.priority}</p>
                  </div>
                  {selectedRequisition.finance_approved && (
                    <div className="pt-2 border-t border-gray-300">
                      <p className="text-xs text-blue-600 font-medium">
                        Finance Reviewed by {selectedRequisition.finance_approved_by}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(selectedRequisition.amount)}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                {actionType === 'finance-review' && 'Mark this requisition as reviewed by Finance. Admin will provide final approval.'}
                {actionType === 'admin-approve' && 'This will provide final approval and create financial records. This action cannot be undone.'}
                {actionType === 'reject' && 'Are you sure you want to reject this requisition?'}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequisition(null)
                }}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={processing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'finance-review'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : actionType === 'admin-approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' :
                  actionType === 'finance-review' ? 'Confirm Review' :
                  actionType === 'admin-approve' ? 'Approve & Release' :
                  'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

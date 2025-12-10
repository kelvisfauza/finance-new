import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Receipt, CheckCircle, Clock, XCircle, Download, Search, Printer } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'
import { useAuth } from '../contexts/AuthContext'
import { useEmployeesByEmail } from '../hooks/useEmployeesByEmail'
import { useFinanceNotifications } from '../hooks/useFinanceNotifications'

interface Expense {
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
}

export const Expenses = () => {
  const { employee } = useAuth()
  const { createNotification } = useFinanceNotifications()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [actionType, setActionType] = useState<'finance-review' | 'admin-approve' | 'reject'>('admin-approve')

  const isFinanceRole = employee?.role?.toLowerCase().includes('finance') ||
    employee?.permissions?.includes('Finance') ||
    employee?.permissions?.includes('Finance Management') ||
    employee?.permissions?.includes('Finance Approval') ||
    employee?.permissions?.some((p: string) => p.startsWith('Finance:'))
  const isAdminRole = ['Super Admin', 'Administrator', 'Manager'].includes(employee?.role || '')

  const allEmails = useMemo(() => {
    const emails: string[] = []
    expenses.forEach(exp => {
      if (exp.requestedby) emails.push(exp.requestedby)
      if (exp.finance_approved_by) emails.push(exp.finance_approved_by)
      if (exp.admin_approved_by) emails.push(exp.admin_approved_by)
    })
    return emails
  }, [expenses])

  const { getEmployee } = useEmployeesByEmail(allEmails)

  const fetchExpenses = useCallback(async () => {
    try {
      if (initialLoad) {
        setLoading(true)
      }

      let query = supabase
        .from('approval_requests')
        .select('*')
        .in('type', ['Expense Request', 'Company Expense', 'Field Financing Request', 'Personal Expense'])

      if (isFinanceRole) {
        query = query
          .eq('admin_approved', true)
          .in('status', ['Pending Finance', 'Approved'])
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setExpenses(data || [])
    } catch (error: any) {
      console.error('Error fetching expenses:', error)
      if (initialLoad) {
        alert('Failed to fetch expenses')
      }
    } finally {
      if (initialLoad) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [isFinanceRole, initialLoad])

  const getDisplayStatus = useCallback((expense: Expense) => {
    if (expense.status === 'Rejected') return 'Rejected'
    if (expense.finance_approved || expense.status === 'Approved') return 'Approved'
    if (expense.admin_approved && !expense.finance_approved) return 'Pending Finance'
    if (isFinanceRole && expense.admin_approved && !expense.finance_approved) return 'Ready for Review'
    return 'Pending Admin'
  }, [isFinanceRole])

  const filterExpenses = useCallback(() => {
    let filtered = expenses

    if (statusFilter) {
      filtered = filtered.filter(expense => {
        const displayStatus = getDisplayStatus(expense)
        return displayStatus === statusFilter || expense.status === statusFilter
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.requestedby?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredExpenses(filtered)
  }, [expenses, searchTerm, statusFilter, getDisplayStatus])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  useEffect(() => {
    filterExpenses()
  }, [filterExpenses])

  useRealtimeSubscription(
    ['approval_requests'],
    fetchExpenses
  )

  const handleFinanceReview = (expense: Expense) => {
    setSelectedExpense(expense)
    setActionType('finance-review')
    setShowModal(true)
  }

  const handleAdminApprove = (expense: Expense) => {
    setSelectedExpense(expense)
    setActionType('admin-approve')
    setShowModal(true)
  }

  const handleReject = (expense: Expense) => {
    setSelectedExpense(expense)
    setActionType('reject')
    setShowModal(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedExpense || !employee) return

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
          .eq('id', selectedExpense.id)

        if (updateError) throw updateError

        const { error: expenseError } = await supabase
          .from('finance_expenses')
          .insert({
            category: selectedExpense.type || 'Expense',
            description: selectedExpense.title,
            amount: selectedExpense.amount,
            date: new Date().toISOString().split('T')[0],
            department: selectedExpense.department,
            approval_request_id: selectedExpense.id
          })

        if (expenseError) throw expenseError

        // Get current cash balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .single()

        if (balanceError) throw new Error(`Failed to fetch cash balance: ${balanceError.message}`)

        const currentBalance = parseFloat(balanceData.current_balance)
        const expenseAmount = typeof selectedExpense.amount === 'string' ? parseFloat(selectedExpense.amount) : selectedExpense.amount
        const balanceAfter = currentBalance - expenseAmount

        // Record cash transaction
        const { error: cashError } = await supabase
          .from('finance_cash_transactions')
          .insert({
            transaction_type: 'expense',
            amount: expenseAmount,
            balance_after: balanceAfter,
            notes: `${selectedExpense.type}: ${selectedExpense.title}`,
            reference: selectedExpense.id,
            created_by: employee.name,
            created_at: new Date().toISOString(),
            status: 'confirmed'
          })

        if (cashError) throw cashError

        // Update cash balance
        const { error: updateBalanceError } = await supabase
          .from('finance_cash_balance')
          .update({
            current_balance: balanceAfter,
            last_updated: new Date().toISOString(),
            updated_by: employee.name
          })
          .eq('singleton', true)

        if (updateBalanceError) throw new Error(`Failed to update cash balance: ${updateBalanceError.message}`)

        await createNotification(
          'Expense Approved',
          `Your expense "${selectedExpense.title}" for ${formatCurrency(selectedExpense.amount)} has been approved by Finance.`,
          {
            type: 'system',
            priority: 'Medium',
            targetUserEmail: selectedExpense.requestedby,
            metadata: {
              expenseId: selectedExpense.id,
              amount: selectedExpense.amount,
              approvedBy: employee.name,
            }
          }
        )

        fetchExpenses()
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
          .eq('id', selectedExpense.id)

        if (updateError) throw updateError

        await createNotification(
          'Expense Approved by Admin',
          `Your expense "${selectedExpense.title}" for ${formatCurrency(selectedExpense.amount)} has been approved by Admin. Awaiting Finance review.`,
          {
            type: 'system',
            priority: 'Medium',
            targetUserEmail: selectedExpense.requestedby,
            metadata: {
              expenseId: selectedExpense.id,
              amount: selectedExpense.amount,
              approvedBy: employee.name,
            }
          }
        )

        fetchExpenses()
      } else if (actionType === 'reject') {
        const { error } = await supabase
          .from('approval_requests')
          .update({
            status: 'Rejected',
            finance_approved: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedExpense.id)

        if (error) throw error

        await createNotification(
          'Expense Rejected',
          `Your expense "${selectedExpense.title}" for ${formatCurrency(selectedExpense.amount)} has been rejected by Finance.`,
          {
            type: 'system',
            priority: 'High',
            targetUserEmail: selectedExpense.requestedby,
            metadata: {
              expenseId: selectedExpense.id,
              amount: selectedExpense.amount,
              rejectedBy: employee.name,
            }
          }
        )

        fetchExpenses()
      }

      setShowModal(false)
      setSelectedExpense(null)
    } catch (error: any) {
      console.error('Error processing action:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredExpenses.map(expense => ({
      Type: expense.type,
      Title: expense.title,
      Amount: expense.amount,
      Status: expense.status,
      Priority: expense.priority,
      Department: expense.department,
      RequestedBy: expense.requestedby,
      DateRequested: expense.daterequested
    }))
    exportToCSV(exportData, `expenses-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  const handlePrint = async (expense: Expense) => {
    const requester = getEmployee(expense.requestedby)
    const financeApprover = expense.finance_approved_by ? getEmployee(expense.finance_approved_by) : null
    const adminApprover = expense.admin_approved_by ? getEmployee(expense.admin_approved_by) : null
    const formattedAmount = formatCurrency(expense.amount)

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
        <title>Payment Voucher - ${expense.title}</title>
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
        <div class="document-type">Payment Voucher</div>

        <div class="voucher-info">
          <div class="info-section">
            <div class="info-row">
              <span class="label">Voucher No:</span>
              <span class="value">#${expense.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Type:</span>
              <span class="value">${expense.type}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${expense.department}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value" style="color: #16a34a; font-weight: bold;">${expense.status}</span>
            </div>
          </div>
        </div>

        <div class="details-section">
          <div class="section-title">Payment Details</div>
          <div class="info-row">
            <span class="label">Payee:</span>
            <span class="value">${requester?.name || expense.requestedby}</span>
          </div>
          ${requester?.position ? `
          <div class="info-row">
            <span class="label">Position:</span>
            <span class="value">${requester.position}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Description:</span>
            <span class="value">${expense.title}</span>
          </div>
          ${expense.description ? `
          <div class="info-row">
            <span class="label">Details:</span>
            <span class="value">${expense.description}</span>
          </div>
          ` : ''}
        </div>

        <div class="amount-section">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">AMOUNT TO BE PAID</div>
          <div class="amount">${formattedAmount}</div>
        </div>

        <div class="details-section">
          <div class="section-title">Approval Process</div>
          <div style="background: #f9fafb; padding: 10px; border-radius: 4px; border-left: 3px solid #8B4513;">
            <div style="margin-bottom: 8px;">
              <strong style="color: #8B4513; font-size: 11px;">STEP 1: ADMIN APPROVAL</strong>
              ${expense.admin_approved ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${adminApprover?.name || expense.admin_approved_by || 'N/A'}</span>
                </div>
                ${adminApprover?.position ? `
                <div class="info-row">
                  <span class="label">Position:</span>
                  <span class="value">${adminApprover.position}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${expense.admin_approved_at ? new Date(expense.admin_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 4px; font-size: 10px;">Pending Admin Approval</div>'}
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
              <strong style="color: #8B4513; font-size: 11px;">STEP 2: FINANCE APPROVAL</strong>
              ${expense.finance_approved ? `
                <div class="info-row" style="margin-top: 8px;">
                  <span class="label">✓ Approved By:</span>
                  <span class="value" style="color: #16a34a;">${financeApprover?.name || expense.finance_approved_by || 'N/A'}</span>
                </div>
                ${financeApprover?.position ? `
                <div class="info-row">
                  <span class="label">Position:</span>
                  <span class="value">${financeApprover.position}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="label">Date & Time:</span>
                  <span class="value">${expense.finance_approved_at ? new Date(expense.finance_approved_at).toLocaleString() : 'N/A'}</span>
                </div>
              ` : '<div style="color: #999; margin-top: 4px; font-size: 10px;">Pending Finance Approval</div>'}
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">
              <strong>Received By</strong><br>
              <span style="font-size: 10px;">Name & Signature</span>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expenses</h1>
          <p className="text-gray-600">Review and approve expense requests</p>
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
                placeholder="Search by description or category..."
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Requested By</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-gray-600">{expense.type}</span>
                    </td>
                    <td className="py-3 px-4">{expense.title}</td>
                    <td className="py-3 px-4">{expense.department}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const requester = getEmployee(expense.requestedby)
                        return requester ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{requester.name}</div>
                            <div className="text-xs text-gray-500">{requester.position}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{expense.requestedby}</span>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(expense.amount)}</td>
                    <td className="py-3 px-4">
                      {(() => {
                        const displayStatus = getDisplayStatus(expense)
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
                    <td className="py-3 px-4 text-sm">{expense.daterequested}</td>
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const displayStatus = getDisplayStatus(expense)

                        if (displayStatus === 'Approved') {
                          return (
                            <button
                              onClick={() => handlePrint(expense)}
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
                                    onClick={() => handleAdminApprove(expense)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(expense)}
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
                                    onClick={() => handleFinanceReview(expense)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Final Approve & Release Cash
                                  </button>
                                  <button
                                    onClick={() => handleReject(expense)}
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

      {showModal && selectedExpense && (
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
                {actionType === 'reject' && 'Reject Expense'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="font-semibold">{selectedExpense.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Title</p>
                    <p className="font-semibold">{selectedExpense.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Department</p>
                    <p className="font-semibold">{selectedExpense.department}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Requested By</p>
                    <p className="font-semibold">{selectedExpense.requestedby}</p>
                  </div>
                  {selectedExpense.finance_approved && (
                    <div className="pt-2 border-t border-gray-300">
                      <p className="text-xs text-blue-600 font-medium">
                        Finance Reviewed by {selectedExpense.finance_approved_by}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                {actionType === 'finance-review' && 'Mark this expense as reviewed by Finance. Admin will provide final approval.'}
                {actionType === 'admin-approve' && 'This will provide final approval and create financial records. This action cannot be undone.'}
                {actionType === 'reject' && 'Are you sure you want to reject this expense?'}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedExpense(null)
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

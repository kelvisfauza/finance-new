import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Receipt, CheckCircle, Clock, XCircle, Download, Search } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'
import { useAuth } from '../contexts/AuthContext'
import { useEmployeesByEmail } from '../hooks/useEmployeesByEmail'

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

  const isFinanceRole = employee?.role?.toLowerCase().includes('finance')
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

  useEffect(() => {
    fetchExpenses()

    const interval = setInterval(() => {
      fetchExpenses()
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, statusFilter])

  const fetchExpenses = async () => {
    try {
      if (initialLoad) {
        setLoading(true)
      }

      let query = supabase
        .from('approval_requests')
        .select('*')
        .in('type', ['Expense Request', 'Company Expense', 'Field Financing Request'])

      if (isFinanceRole && !isAdminRole) {
        query = query
          .eq('finance_approved', false)
          .in('status', ['Pending Finance', 'Pending', 'Processing'])
      } else if (isAdminRole && !isFinanceRole) {
        query = query
          .eq('finance_approved', true)
          .eq('admin_approved', false)
          .in('status', ['Pending Admin Approval', 'Finance Approved'])
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
  }

  const getDisplayStatus = (expense: Expense) => {
    if (expense.status === 'Rejected') return 'Rejected'
    if (expense.admin_approved || expense.status === 'Approved') return 'Approved'
    if (expense.finance_approved || expense.status === 'Pending Admin Approval') return 'Pending Admin Approval'
    return 'Pending Finance'
  }

  const filterExpenses = () => {
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
  }

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
        const { error } = await supabase
          .from('approval_requests')
          .update({
            finance_approved: true,
            finance_approved_by: employee.name,
            finance_approved_at: new Date().toISOString(),
            status: 'Pending Admin Approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedExpense.id)

        if (error) throw error

        fetchExpenses()
      } else if (actionType === 'admin-approve') {
        const { error: updateError } = await supabase
          .from('approval_requests')
          .update({
            status: 'Approved',
            admin_approved: true,
            admin_approved_by: employee.name,
            admin_approved_at: new Date().toISOString(),
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

        fetchExpenses()
      } else if (actionType === 'reject') {
        const { error } = await supabase
          .from('approval_requests')
          .update({
            status: 'Rejected',
            admin_approved: false,
            admin_approved_by: employee.name,
            admin_approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedExpense.id)

        if (error) throw error

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
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
              <option value="Pending Finance">Pending Finance</option>
              <option value="Pending Admin Approval">Pending Admin Approval</option>
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
                              : displayStatus === 'Pending Admin Approval'
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

                        if (displayStatus === 'Approved' || displayStatus === 'Rejected') {
                          return null
                        }

                        if (displayStatus === 'Pending Finance') {
                          return (
                            <div className="flex justify-center gap-2">
                              {isFinanceRole && (
                                <button
                                  onClick={() => handleFinanceReview(expense)}
                                  disabled={processing}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                  Finance Review
                                </button>
                              )}
                              {isAdminRole && (
                                <>
                                  <button
                                    onClick={() => handleAdminApprove(expense)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Approve & Release
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

                        if (displayStatus === 'Pending Admin Approval') {
                          return (
                            <div className="flex justify-center gap-2">
                              {isAdminRole && (
                                <>
                                  <button
                                    onClick={() => handleAdminApprove(expense)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Approve & Release
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

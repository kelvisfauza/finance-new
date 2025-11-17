import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { FileText, CheckCircle, Clock, XCircle, Download, Search } from 'lucide-react'
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

  const isFinanceRole = employee?.role?.toLowerCase().includes('finance')
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
        .eq('type', 'Requisition')

      if (isFinanceRole) {
        query = query
          .eq('admin_approved', true)
          .eq('finance_approved', false)
          .eq('status', 'Pending Finance')
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
    if (req.admin_approved || req.status === 'Approved') return 'Approved'
    if (req.finance_approved || req.status === 'Pending Admin Approval') return 'Pending Admin Approval'
    return 'Pending Finance'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Requisitions</h1>
          <p className="text-gray-600">Review and approve purchase requisitions</p>
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
                    <td className="py-3 px-4 text-sm">{requisition.daterequested}</td>
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const displayStatus = getDisplayStatus(requisition)

                        if (displayStatus === 'Approved' || displayStatus === 'Rejected') {
                          return null
                        }

                        if (displayStatus === 'Pending Finance') {
                          return (
                            <div className="flex justify-center gap-2">
                              {isFinanceRole && (
                                <>
                                  <button
                                    onClick={() => handleFinanceReview(requisition)}
                                    disabled={processing}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    Approve & Pay
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

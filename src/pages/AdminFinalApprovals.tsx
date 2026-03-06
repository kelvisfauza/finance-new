import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { CheckCircle, Clock, X, Users, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSMSNotifications } from '../hooks/useSMSNotifications'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface PendingApproval {
  id: string
  type: string
  title?: string
  description?: string
  reason?: string
  amount: number
  status: string
  approval_stage: string
  finance_reviewed: boolean
  finance_review_at: string
  finance_review_by: string
  admin_final_approval: boolean
  requestedby?: string
  requestedby_name?: string
  user_id?: string
  employee_name?: string
  employee_phone?: string
  created_at: string
  disbursement_method?: string
  disbursement_phone?: string
  disbursement_bank_name?: string
  disbursement_account_number?: string
  disbursement_account_name?: string
}

export const AdminFinalApprovals = () => {
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { user, employee } = useAuth()
  const { sendFinanceApprovalCompleteSMS } = useSMSNotifications()

  const isAdminRole = ['Super Admin', 'Administrator', 'Manager'].includes(employee?.role || '')

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true)

      const approvalQuery = supabase
        .from('approval_requests')
        .select('*')
        .eq('finance_reviewed', true)
        .eq('admin_final_approval', false)
        .eq('status', 'Finance Approved')

      const moneyQuery = supabase
        .from('money_requests')
        .select('*')
        .eq('finance_reviewed', true)
        .eq('admin_final_approval', false)
        .eq('status', 'Finance Approved')

      const [approvalResult, moneyResult] = await Promise.all([
        approvalQuery.order('created_at', { ascending: false }),
        moneyQuery.order('created_at', { ascending: false })
      ])

      if (approvalResult.error) throw approvalResult.error
      if (moneyResult.error) throw moneyResult.error

      const allApprovals = [
        ...(approvalResult.data || []),
        ...(moneyResult.data || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (allApprovals.length > 0) {
        const userIds = allApprovals.map((a: any) => a.user_id).filter(Boolean)
        const { data: employees } = await supabase
          .from('employees')
          .select('auth_user_id, name, phone')

        type EmployeeInfo = { name: string; phone: string }
        const employeeMap = new Map<string, EmployeeInfo>(
          employees?.map((emp: any) => [emp.auth_user_id, { name: emp.name, phone: emp.phone }]) || []
        )

        const enrichedApprovals = allApprovals.map((approval: any) => {
          const empInfo = employeeMap.get(approval.user_id)
          return {
            ...approval,
            employee_name: empInfo?.name || approval.requestedby_name || approval.requestedby,
            employee_phone: empInfo?.phone
          }
        })

        setApprovals(enrichedApprovals)
      } else {
        setApprovals([])
      }
    } catch (error: any) {
      console.error('Error fetching pending approvals:', error)
      alert('Failed to fetch pending approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingApprovals()
  }, [fetchPendingApprovals])

  useRealtimeSubscription(['approval_requests', 'money_requests', 'finance_cash_transactions'], fetchPendingApprovals)

  const handleFinalApprove = async (approval: PendingApproval) => {
    if (processingId || !isAdminRole) return

    const confirmMsg = `Are you sure you want to give final approval and disburse ${formatCurrency(approval.amount)} for ${approval.title || approval.reason}?`
    if (!window.confirm(confirmMsg)) return

    try {
      setProcessingId(approval.id)

      setApprovals(prev => prev.filter(a => a.id !== approval.id))

      const tableName = approval.user_id ? 'money_requests' : 'approval_requests'

      const { data: checkData } = await supabase
        .from(tableName)
        .select('admin_final_approval')
        .eq('id', approval.id)
        .maybeSingle()

      if (checkData?.admin_final_approval) {
        alert('This request has already been given final approval')
        await fetchPendingApprovals()
        return
      }

      const { data: existingTransaction } = await supabase
        .from('finance_cash_transactions')
        .select('id')
        .eq('reference', approval.id)
        .maybeSingle()

      if (existingTransaction) {
        alert('This payment has already been processed')
        await fetchPendingApprovals()
        return
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: 'Approved',
          admin_final_approval: true,
          admin_final_approval_at: new Date().toISOString(),
          admin_final_approval_by: employee?.name || user?.email || 'Admin',
          approval_stage: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', approval.id)

      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error(`Failed to update approval: ${updateError.message}`)
      }

      const { data: balanceData, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .single()

      if (balanceError) {
        throw new Error(`Failed to fetch cash balance: ${balanceError.message}`)
      }

      const currentBalance = parseFloat(balanceData.current_balance)
      const paymentAmount = typeof approval.amount === 'string' ? parseFloat(approval.amount) : approval.amount
      const balanceAfter = currentBalance - paymentAmount

      const { error: cashError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'salary',
          amount: paymentAmount,
          balance_after: balanceAfter,
          notes: `${approval.type}: ${approval.title || approval.reason}`,
          reference: approval.id,
          created_by: user?.email || 'Admin',
          created_at: new Date().toISOString(),
          status: 'confirmed'
        })

      if (cashError) {
        if (cashError.message?.includes('duplicate key')) {
          throw new Error('This payment has already been processed.')
        }
        throw new Error(`Failed to record cash transaction: ${cashError.message}`)
      }

      const { error: updateBalanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: balanceAfter,
          last_updated: new Date().toISOString(),
          updated_by: user?.email || 'Admin'
        })
        .eq('singleton', true)

      if (updateBalanceError) {
        throw new Error(`Failed to update cash balance: ${updateBalanceError.message}`)
      }

      if (approval.employee_phone) {
        await sendFinanceApprovalCompleteSMS(
          approval.employee_name || 'Employee',
          approval.employee_phone,
          approval.amount,
          approval.type,
          approval.disbursement_method || 'CASH'
        )
      }

      await fetchPendingApprovals()
      alert('Final approval completed and payment disbursed successfully')
    } catch (error: any) {
      console.error('Error processing final approval:', error)
      alert(`Failed to process final approval: ${error.message || 'Unknown error'}`)
      await fetchPendingApprovals()
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (approval: PendingApproval) => {
    if (processingId || !isAdminRole) return

    const reason = window.prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      setProcessingId(approval.id)
      setApprovals(prev => prev.filter(a => a.id !== approval.id))

      const tableName = approval.user_id ? 'money_requests' : 'approval_requests'

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: 'Rejected',
          rejection_reason: reason,
          rejection_comments: `Rejected by admin after finance review: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', approval.id)

      if (updateError) {
        throw new Error(`Failed to reject: ${updateError.message}`)
      }

      await fetchPendingApprovals()
      alert('Request rejected successfully')
    } catch (error: any) {
      console.error('Error rejecting:', error)
      alert(`Failed to reject: ${error.message}`)
      await fetchPendingApprovals()
    } finally {
      setProcessingId(null)
    }
  }

  if (!isAdminRole) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          You do not have permission to access this page. Admin role required.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Final Approvals & Disbursement</h1>
        <p className="text-gray-600">Review and approve finance-reviewed requests for final disbursement</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
        <p className="font-medium">New Approval Flow</p>
        <p className="text-sm mt-1">
          Finance reviews first → Admin gives final approval and disburses payment
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No pending final approvals</p>
          <p className="text-gray-500 text-sm mt-2">All finance-reviewed requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {approval.title || approval.reason}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Finance Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(approval.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="text-sm font-medium text-gray-900">{approval.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requested By</p>
                      <p className="text-sm font-medium text-gray-900">{approval.employee_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Finance Reviewed By</p>
                      <p className="text-sm font-medium text-gray-900">{approval.finance_review_by}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requested Date</p>
                      <p className="text-sm text-gray-700">{formatDate(approval.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Finance Reviewed Date</p>
                      <p className="text-sm text-gray-700">{formatDate(approval.finance_review_at)}</p>
                    </div>
                  </div>

                  {approval.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm text-gray-700 mt-1">{approval.description}</p>
                    </div>
                  )}

                  {approval.disbursement_method && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Disbursement Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Method:</span>
                          <span className="ml-2 font-medium">{approval.disbursement_method}</span>
                        </div>
                        {approval.disbursement_phone && (
                          <div>
                            <span className="text-gray-500">Phone:</span>
                            <span className="ml-2 font-medium">{approval.disbursement_phone}</span>
                          </div>
                        )}
                        {approval.disbursement_bank_name && (
                          <>
                            <div>
                              <span className="text-gray-500">Bank:</span>
                              <span className="ml-2 font-medium">{approval.disbursement_bank_name}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Account:</span>
                              <span className="ml-2 font-medium">{approval.disbursement_account_number}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleFinalApprove(approval)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {processingId === approval.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve & Disburse
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(approval)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

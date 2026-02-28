import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate } from '../../lib/utils'
import { CheckCircle, XCircle, Clock, AlertCircle, UserCheck } from 'lucide-react'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  reason: string
  status: string
  request_type: string
  payment_channel: string
  phone_number: string | null
  disbursement_bank_name: string | null
  disbursement_account_number: string | null
  disbursement_account_name: string | null
  requested_by: string
  created_at: string
  requires_three_approvals: boolean
  admin_approved_1: boolean
  admin_approved_1_by: string | null
  admin_approved_1_at: string | null
  admin_approved_2: boolean
  admin_approved_2_by: string | null
  admin_approved_2_at: string | null
  admin_approved_3: boolean
  admin_approved_3_by: string | null
  admin_approved_3_at: string | null
  employee_name?: string
}

export const AdminWithdrawalApprovals = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')

  useEffect(() => {
    fetchCurrentUser()
    fetchRequests()

    const channel = supabase
      .channel('admin-withdrawal-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_requests' }, fetchRequests)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      setCurrentUserEmail(user.email)
    }
  }

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .eq('request_type', 'withdrawal')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      const enrichedRequests = await Promise.all(
        (data || []).map(async (req: any) => {
          const { data: empData } = await supabase
            .from('employees')
            .select('name')
            .eq('email', req.requested_by)
            .maybeSingle()

          return {
            ...req,
            employee_name: empData?.name || req.requested_by
          }
        })
      )

      setRequests(enrichedRequests)
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const canApprove = (request: WithdrawalRequest): { can: boolean; reason?: string } => {
    if (request.requested_by === currentUserEmail) {
      return { can: false, reason: 'Cannot approve your own withdrawal request' }
    }

    const approvers = [
      request.admin_approved_1_by,
      request.admin_approved_2_by,
      request.admin_approved_3_by
    ].filter(Boolean)

    if (approvers.includes(currentUserEmail)) {
      return { can: false, reason: 'You have already approved this request' }
    }

    if (request.requires_three_approvals) {
      if (!request.admin_approved_1) return { can: true }
      if (!request.admin_approved_2 && request.admin_approved_1_by !== currentUserEmail) return { can: true }
      if (!request.admin_approved_3 && request.admin_approved_2_by !== currentUserEmail) return { can: true }
      return { can: false, reason: 'All required admin approvals are complete' }
    } else {
      if (!request.admin_approved_1) return { can: true }
      return { can: false, reason: 'Admin approval already provided' }
    }
  }

  const handleApprove = async (request: WithdrawalRequest) => {
    const approvalCheck = canApprove(request)
    if (!approvalCheck.can) {
      alert(approvalCheck.reason)
      return
    }

    if (!confirm(`Approve ${formatCurrency(request.amount)} withdrawal for ${request.employee_name}?`)) {
      return
    }

    setProcessing(request.id)
    try {
      const now = new Date().toISOString()
      let updateData: any = {}

      if (!request.admin_approved_1) {
        updateData = {
          admin_approved_1: true,
          admin_approved_1_by: currentUserEmail,
          admin_approved_1_at: now
        }
      } else if (!request.admin_approved_2 && request.requires_three_approvals) {
        updateData = {
          admin_approved_2: true,
          admin_approved_2_by: currentUserEmail,
          admin_approved_2_at: now
        }
      } else if (!request.admin_approved_3 && request.requires_three_approvals) {
        updateData = {
          admin_approved_3: true,
          admin_approved_3_by: currentUserEmail,
          admin_approved_3_at: now,
          admin_approved: true,
          admin_approved_by: currentUserEmail,
          admin_approved_at: now
        }
      }

      if (request.requires_three_approvals === false && !request.admin_approved_1) {
        updateData.admin_approved = true
        updateData.admin_approved_by = currentUserEmail
        updateData.admin_approved_at = now
      }

      const { error } = await supabase
        .from('money_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) throw error

      alert(`Withdrawal request approved successfully`)
      fetchRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      alert(`Failed to approve: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (request: WithdrawalRequest) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason || reason.trim() === '') {
      alert('Rejection reason is required')
      return
    }

    setProcessing(request.id)
    try {
      const { error } = await supabase
        .from('money_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', request.id)

      if (error) throw error

      alert('Request rejected')
      fetchRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert(`Failed to reject: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const getApprovalStatus = (request: WithdrawalRequest) => {
    if (request.requires_three_approvals) {
      const approvals = [
        request.admin_approved_1,
        request.admin_approved_2,
        request.admin_approved_3
      ].filter(Boolean).length
      return `${approvals}/3 Admin Approvals`
    } else {
      return request.admin_approved_1 ? '1/1 Admin Approval' : '0/1 Admin Approval'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
          Withdrawal Requests - Admin Approval
        </h3>
        {requests.length > 0 && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            {requests.length} pending
          </span>
        )}
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Approval Tiers:</strong> Amounts ≤ 100,000 UGX require 1 admin approval.
          Amounts &gt; 100,000 UGX require 3 approvals from 3 different admins.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No pending withdrawal requests</p>
          <p className="text-sm text-gray-500 mt-1">All requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const approvalCheck = canApprove(req)
            return (
              <div
                key={req.id}
                className={`border rounded-lg p-4 ${
                  approvalCheck.can ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{req.employee_name}</p>
                      {req.requires_three_approvals && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                          High Value
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                    <p className="text-sm text-gray-600 mt-1">{req.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(req.created_at)}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-700">
                        {getApprovalStatus(req)}
                      </span>
                    </div>

                    {req.admin_approved_1 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>✓ Approved by: {req.admin_approved_1_by}</p>
                      </div>
                    )}
                    {req.admin_approved_2 && (
                      <div className="text-xs text-gray-600">
                        <p>✓ Approved by: {req.admin_approved_2_by}</p>
                      </div>
                    )}
                    {req.admin_approved_3 && (
                      <div className="text-xs text-gray-600">
                        <p>✓ Approved by: {req.admin_approved_3_by}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      {req.payment_channel === 'MOBILE_MONEY' && req.phone_number && (
                        <p><strong>Mobile:</strong> {req.phone_number}</p>
                      )}
                      {req.payment_channel === 'BANK' && (
                        <div>
                          <p><strong>Bank:</strong> {req.disbursement_bank_name}</p>
                          <p><strong>A/C:</strong> {req.disbursement_account_number}</p>
                          <p><strong>Name:</strong> {req.disbursement_account_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!approvalCheck.can && approvalCheck.reason && (
                  <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{approvalCheck.reason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={!approvalCheck.can || processing === req.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {processing === req.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={processing === req.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

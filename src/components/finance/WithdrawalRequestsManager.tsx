import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Phone, Banknote, CheckCircle, XCircle, Printer, Clock, Building, AlertCircle, Wallet } from 'lucide-react'

interface Approver {
  email: string
  name: string
  position: string
  approved_at: string
}

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  reason: string
  status: string
  request_type: string
  phone_number: string | null
  payment_channel: string
  disbursement_method: string | null
  disbursement_phone: string | null
  disbursement_bank_name: string | null
  disbursement_account_number: string | null
  disbursement_account_name: string | null
  requested_by: string
  requester_email: string
  requester_name: string | null
  created_at: string
  requires_three_approvals: boolean
  admin_approved: boolean
  admin_approved_1: boolean
  admin_approved_2: boolean
  admin_approved_3: boolean
  admin_approved_1_by: string | null
  admin_approved_2_by: string | null
  wallet_balance_verified: boolean
  employee_name?: string
  employee_position?: string
  wallet_balance?: number
  approvers?: Approver[]
}

export const WithdrawalRequestsManager = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      setCurrentUserEmail(user.email)
    }
  }

  const fetchRequests = async () => {
    try {
      const { data: allData, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending_finance')
        .order('created_at', { ascending: false })

      if (error) throw error

      const enrichedRequests = await Promise.all(
        (allData || []).map(async (req: any) => {
          const { data: empData } = await supabase
            .from('employees')
            .select('name, position')
            .eq('email', req.requester_email)
            .maybeSingle()

          const { data: walletData } = await supabase
            .from('user_accounts')
            .select('current_balance')
            .eq('user_id', req.user_id)
            .maybeSingle()

          // Fetch approver details
          const approvers = []
          if (req.admin_approved_1_by) {
            const { data: approver1 } = await supabase
              .from('employees')
              .select('name, position')
              .eq('email', req.admin_approved_1_by)
              .maybeSingle()
            approvers.push({
              email: req.admin_approved_1_by,
              name: approver1?.name || req.admin_approved_1_by,
              position: approver1?.position || 'Admin',
              approved_at: req.admin_approved_1_at
            })
          }
          if (req.admin_approved_2_by) {
            const { data: approver2 } = await supabase
              .from('employees')
              .select('name, position')
              .eq('email', req.admin_approved_2_by)
              .maybeSingle()
            approvers.push({
              email: req.admin_approved_2_by,
              name: approver2?.name || req.admin_approved_2_by,
              position: approver2?.position || 'Admin',
              approved_at: req.admin_approved_2_at
            })
          }

          return {
            ...req,
            requested_by: req.requester_email,
            reason: 'Wallet Withdrawal',
            payment_channel: req.disbursement_method || 'MOBILE_MONEY',
            employee_name: req.requester_name || empData?.name || req.requester_email,
            employee_position: empData?.position,
            wallet_balance: walletData?.current_balance || 0,
            approvers
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

  useEffect(() => {
    fetchRequests()

    const channel = supabase
      .channel('withdrawal-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, fetchRequests)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const canApprove = (request: WithdrawalRequest): { can: boolean; reason?: string } => {
    if (request.requested_by === currentUserEmail) {
      return { can: false, reason: 'You cannot approve your own withdrawal request' }
    }

    if ((request.wallet_balance || 0) < request.amount) {
      return { can: false, reason: `Insufficient wallet balance (${formatCurrency(request.wallet_balance || 0)} available)` }
    }

    return { can: true }
  }

  const handleApprove = async (request: WithdrawalRequest) => {
    const approvalCheck = canApprove(request)
    if (!approvalCheck.can) {
      alert(`Cannot approve: ${approvalCheck.reason}`)
      return
    }

    const confirmMsg = `Approve ${formatCurrency(request.amount)} withdrawal to ${request.employee_name}?

Wallet Balance: ${formatCurrency(request.wallet_balance || 0)}
After Withdrawal: ${formatCurrency((request.wallet_balance || 0) - request.amount)}

Payment Method: ${request.payment_channel}`

    if (!confirm(confirmMsg)) {
      return
    }

    setProcessing(request.id)
    try {
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_at: now,
          approved_by: currentUserEmail,
          finance_approved_by: currentUserEmail,
          finance_approved_at: now
        })
        .eq('id', request.id)

      if (error) throw error

      alert(`✓ Withdrawal approved! ${formatCurrency(request.amount)} deducted from wallet.`)

      const channel = (request as any).disbursement_method || request.payment_channel

      if (channel === 'CASH') {
        printCashSlip(request)
      } else if (channel === 'MOBILE_MONEY') {
        const phone = (request as any).disbursement_phone || request.phone_number
        alert(`Mobile money payment of ${formatCurrency(request.amount)} to ${phone} will be processed.`)
      } else if (channel === 'BANK') {
        alert(`Bank transfer of ${formatCurrency(request.amount)} to ${request.disbursement_account_name} will be processed.`)
      }

      fetchRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      alert(`Failed to approve: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (request: WithdrawalRequest) => {
    setRejectingId(request.id)
    setRejectionReason('')
  }

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    if (!rejectingId) return

    setProcessing(rejectingId)
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          rejected_by: currentUserEmail,
          rejected_at: new Date().toISOString()
        })
        .eq('id', rejectingId)

      if (error) throw error

      alert(`Request rejected. User will be notified: "${rejectionReason}"`)
      setRejectingId(null)
      setRejectionReason('')
      fetchRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert(`Failed to reject: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const printCashSlip = (request: WithdrawalRequest) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>Cash Payment Slip</title>
        <style>
          body { font: 14px/1.4 system-ui; padding: 20px; }
          .card { width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
          h1 { font-size: 18px; margin: 0 0 16px; text-align: center; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
          .sig-line { width: 45%; border-top: 1px solid #000; padding-top: 4px; text-align: center; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="card">
          <h1>CASH PAYMENT SLIP</h1>
          <div class="row"><span>Employee:</span><strong>${request.employee_name}</strong></div>
          <div class="row"><span>Amount:</span><strong>${formatCurrency(request.amount)}</strong></div>
          <div class="row"><span>Reason:</span><span>${request.reason}</span></div>
          <div class="row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div>
          <div class="signatures">
            <div class="sig-line">Received By</div>
            <div class="sig-line">Paid By (Finance)</div>
          </div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-green-600" />
            Withdrawal Requests - Finance Approval
          </h3>
          {requests.length > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              {requests.length} ready for payment
            </span>
          )}
        </div>

        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-900">
            <strong>Finance Approval:</strong> These withdrawal requests have completed all required admin approvals.
            Verify wallet balance and disbursement details before approving.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No withdrawal requests ready for payment</p>
            <p className="text-sm text-gray-500 mt-1">Requests will appear here after admin approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const approvalCheck = canApprove(req)
              const hasSufficientBalance = (req.wallet_balance || 0) >= req.amount

              return (
                <div
                  key={req.id}
                  className={`border rounded-lg p-4 ${
                    !approvalCheck.can ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{req.employee_name}</p>
                        {req.employee_position && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {req.employee_position}
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                      <p className="text-sm text-gray-600 mt-1">{req.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">Requested: {formatDate(req.created_at)}</p>

                      <div className="mt-3 flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${hasSufficientBalance ? 'text-green-500' : 'text-red-500'}`} />
                        <span className={`text-sm font-medium ${hasSufficientBalance ? 'text-green-700' : 'text-red-700'}`}>
                          Wallet Balance: {formatCurrency(req.wallet_balance || 0)}
                        </span>
                      </div>

                      {req.approvers && req.approvers.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-2">Admin Approvals ({req.approvers.length})</p>
                          <div className="space-y-2">
                            {req.approvers.map((approver, idx) => (
                              <div key={idx} className="flex items-start justify-between text-xs">
                                <div className="flex-1">
                                  <p className="font-medium text-green-900">{approver.name}</p>
                                  <p className="text-green-700">{approver.position}</p>
                                </div>
                                <div className="text-right text-green-700">
                                  <p>{formatDate(approver.approved_at)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {req.disbursement_method === 'MOBILE_MONEY' && (
                        <div className="mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center justify-end">
                            <Phone className="w-3 h-3 mr-1" />
                            Mobile Money
                          </span>
                          <p className="text-xs text-gray-600 mt-1">{req.disbursement_phone || req.phone_number}</p>
                        </div>
                      )}
                      {req.disbursement_method === 'CASH' && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full flex items-center">
                          <Banknote className="w-3 h-3 mr-1" />
                          Cash
                        </span>
                      )}
                      {req.disbursement_method === 'BANK' && (
                        <div className="mb-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center justify-end">
                            <Building className="w-3 h-3 mr-1" />
                            Bank Transfer
                          </span>
                          <div className="text-xs text-gray-600 mt-1 text-left">
                            <p><strong>Bank:</strong> {req.disbursement_bank_name}</p>
                            <p><strong>A/C:</strong> {req.disbursement_account_number}</p>
                            <p><strong>Name:</strong> {req.disbursement_account_name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!approvalCheck.can && (
                    <div className="mb-3 p-2 bg-red-100 rounded border border-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-800"><strong>Cannot Approve:</strong> {approvalCheck.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={!approvalCheck.can || processing === req.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {processing === req.id ? 'Processing...' : 'Approve Payment'}
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

      {rejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Withdrawal Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a clear reason for rejection. The user will receive this explanation via SMS.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmReject}
                disabled={!rejectionReason.trim() || processing === rejectingId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing === rejectingId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setRejectingId(null)
                  setRejectionReason('')
                }}
                disabled={processing === rejectingId}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

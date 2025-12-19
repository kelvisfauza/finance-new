import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Phone, Banknote, CheckCircle, XCircle, Printer, Clock } from 'lucide-react'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  reason: string
  status: string
  phone_number: string | null
  payment_channel: string
  requested_by: string
  created_at: string
  employee_name?: string
}

export const WithdrawalRequestsManager = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
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

  useEffect(() => {
    fetchRequests()

    const channel = supabase
      .channel('money-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_requests' }, fetchRequests)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleApprove = async (request: WithdrawalRequest, paymentMethod: 'cash' | 'mobile_money') => {
    if (!confirm(`Approve ${formatCurrency(request.amount)} payment to ${request.employee_name}?`)) {
      return
    }

    setProcessing(request.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const approvedBy = user?.email || 'Finance'

      const { error } = await supabase
        .from('money_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
          payment_channel: paymentMethod === 'cash' ? 'CASH' : 'MOBILE_MONEY'
        })
        .eq('id', request.id)

      if (error) throw error

      alert(`Payment of ${formatCurrency(request.amount)} approved for ${request.employee_name}`)

      if (paymentMethod === 'cash') {
        printCashSlip(request)
      }

      fetchRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      alert(`Failed to approve request: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this withdrawal request?')) {
      return
    }

    setProcessing(requestId)
    try {
      const { error } = await supabase
        .from('money_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)

      if (error) throw error

      alert('Request rejected')
      fetchRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert(`Failed to reject request: ${error.message}`)
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-orange-600" />
          Pending Withdrawal Requests
        </h3>
        {requests.length > 0 && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
            {requests.length} pending
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No pending requests</p>
          <p className="text-sm text-gray-500 mt-1">All withdrawal requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{req.employee_name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(req.amount)}</p>
                  <p className="text-sm text-gray-600 mt-1">{req.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(req.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.payment_channel === 'MOBILE_MONEY' ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      Mobile Money
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full flex items-center">
                      <Banknote className="w-3 h-3 mr-1" />
                      Cash
                    </span>
                  )}
                </div>
              </div>

              {req.phone_number && (
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Phone:</strong> {req.phone_number}
                </p>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-200">
                {req.payment_channel === 'MOBILE_MONEY' ? (
                  <button
                    onClick={() => handleApprove(req, 'mobile_money')}
                    disabled={processing === req.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {processing === req.id ? 'Processing...' : 'Pay Mobile Money'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleApprove(req, 'cash')}
                    disabled={processing === req.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    {processing === req.id ? 'Processing...' : 'Pay Cash & Print'}
                  </button>
                )}
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={processing === req.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

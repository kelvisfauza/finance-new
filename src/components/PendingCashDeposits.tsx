import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface CashDeposit {
  id: string
  transaction_type: string
  amount: number
  balance_after: number
  reference?: string
  notes?: string
  created_by: string
  created_at: string
  status: string
  confirmed_by?: string
  confirmed_at?: string
}

export const PendingCashDeposits = () => {
  const [deposits, setDeposits] = useState<CashDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingDeposits()
  }, [])

  const fetchPendingDeposits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .eq('transaction_type', 'DEPOSIT')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeposits(data || [])
    } catch (error: any) {
      console.error('Error fetching pending deposits:', error)
      alert('Failed to fetch pending deposits')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDeposit = async (deposit: CashDeposit) => {
    if (!confirm(`Confirm receipt of ${formatCurrency(deposit.amount)} from ${deposit.created_by}?`)) {
      return
    }

    try {
      setProcessing(deposit.id)

      const { data: existingDeposit, error: fetchError } = await supabase
        .from('finance_cash_transactions')
        .select('status')
        .eq('id', deposit.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!existingDeposit || existingDeposit.status !== 'pending') {
        alert('This deposit has already been confirmed')
        fetchPendingDeposits()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      const confirmedBy = user?.email || 'Finance'

      const { error: updateError } = await supabase
        .from('finance_cash_transactions')
        .update({
          status: 'confirmed',
          confirmed_by: confirmedBy,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', deposit.id)

      if (updateError) throw updateError

      const { data: currentBalance, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (balanceError) throw balanceError

      const newBalance = (currentBalance?.current_balance || 0) + deposit.amount

      const { error: balanceUpdateError } = await supabase
        .from('finance_cash_balance')
        .upsert({
          current_balance: newBalance,
          last_updated: new Date().toISOString(),
          updated_by: confirmedBy
        })

      if (balanceUpdateError) throw balanceUpdateError

      alert('Deposit confirmed successfully')
      fetchPendingDeposits()
    } catch (error: any) {
      console.error('Error confirming deposit:', error)
      alert(`Failed to confirm deposit: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
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
          Pending Cash Deposits
        </h3>
        {deposits.length > 0 && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
            {deposits.length} pending
          </span>
        )}
      </div>

      {deposits.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No pending deposits</p>
          <p className="text-sm text-gray-500 mt-1">All deposits have been confirmed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit) => (
            <div
              key={deposit.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(deposit.amount)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    From: <span className="font-medium">{deposit.created_by}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Date: {formatDate(deposit.created_at)}
                  </p>
                  {deposit.reference && (
                    <p className="text-sm text-gray-600 mb-1">
                      Reference: <span className="font-medium">{deposit.reference}</span>
                    </p>
                  )}
                  {deposit.notes && (
                    <p className="text-sm text-gray-500 italic">
                      Note: {deposit.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleConfirmDeposit(deposit)}
                  disabled={processing === deposit.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === deposit.id ? 'Confirming...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { Coffee, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { usePendingCoffeePayments } from '../hooks/usePendingCoffeePayments'

export const PendingCoffeePayments = () => {
  const { data: lots, isLoading, error, refetch } = usePendingCoffeePayments()
  const [processing, setProcessing] = useState<string | null>(null)
  const [cashBalance, setCashBalance] = useState(0)
  const [confirmPayment, setConfirmPayment] = useState<any | null>(null)
  const [supplierAdvances, setSupplierAdvances] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchCashBalanceAndAdvances()
  }, [])

  const fetchCashBalanceAndAdvances = async () => {
    try {
      const [balanceResult, advancesResult] = await Promise.all([
        supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('supplier_advances')
          .select('supplier_id, amount_ugx, outstanding_ugx, is_closed')
          .eq('is_closed', false)
      ])

      setCashBalance(balanceResult.data?.current_balance || 0)

      if (advancesResult.data) {
        const advancesMap: Record<string, number> = {}
        advancesResult.data.forEach((advance: any) => {
          const existing = advancesMap[advance.supplier_id] || 0
          advancesMap[advance.supplier_id] = existing + Number(advance.outstanding_ugx || advance.amount_ugx)
        })
        setSupplierAdvances(advancesMap)
      }
    } catch (err: any) {
      console.error('Error fetching cash balance and advances:', err)
    }
  }

  const handleProcessPayment = (lot: any) => {
    const advanceAmount = supplierAdvances[lot.supplier_id] || 0
    const finalAmount = Math.max(0, lot.total_amount_ugx - advanceAmount)

    if (cashBalance < finalAmount) {
      return
    }

    setConfirmPayment({ ...lot, advanceAmount, finalAmount })
  }

  const confirmProcessPayment = async () => {
    if (!confirmPayment) return
    const lot = confirmPayment

    setConfirmPayment(null)

    try {
      setProcessing(lot.id)

      const { data: { user } } = await supabase.auth.getUser()
      const processedBy = user?.email || 'Finance'

      const { error: updateError } = await supabase
        .from('finance_coffee_lots')
        .update({
          finance_status: 'PAID',
          finance_notes: `Paid ${lot.finalAmount} UGX on ${new Date().toISOString()}`
        })
        .eq('id', lot.id)

      if (updateError) throw updateError

      if (lot.advanceAmount > 0 && lot.supplier_id) {
        const { error: advanceError } = await supabase
          .from('supplier_advances')
          .update({ is_closed: true, outstanding_ugx: 0 })
          .eq('supplier_id', lot.supplier_id)
          .eq('is_closed', false)

        if (advanceError) console.error('Error closing advances:', advanceError)
      }

      const newBalance = cashBalance - lot.finalAmount

      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -lot.finalAmount,
          balance_after: newBalance,
          reference: lot.coffee_record_id || `Coffee lot ${lot.id}`,
          notes: `Coffee payment for ${lot.quantity_kg} kg @ ${lot.unit_price_ugx} UGX/kg`,
          created_by: processedBy,
          status: 'confirmed',
          confirmed_by: processedBy,
          confirmed_at: new Date().toISOString()
        })

      if (transactionError) throw transactionError

      const { error: balanceError } = await supabase
        .from('finance_cash_balance')
        .upsert({
          current_balance: newBalance,
          last_updated: new Date().toISOString(),
          updated_by: processedBy
        })

      if (balanceError) throw balanceError

      fetchCashBalanceAndAdvances()
      refetch()
    } catch (err: any) {
      console.error('Error processing payment:', err)
      alert(`Failed to process payment: ${err.message}`)
    } finally {
      setProcessing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">
          Failed to load pending coffee payments. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Coffee className="w-5 h-5 mr-2 text-brown-600" />
          Pending Coffee Payments
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">Available Cash</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(cashBalance)}</p>
        </div>
      </div>

      {!lots || lots.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No pending coffee payments</p>
          <p className="text-sm text-gray-500 mt-1">All coffee payments are up to date</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Record ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Assessed By</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity (kg)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Price/kg</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Advance</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Net Due</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const advanceAmount = supplierAdvances[lot.supplier_id] || 0
                const finalAmount = Math.max(0, lot.total_amount_ugx - advanceAmount)
                const canPay = cashBalance >= finalAmount

                return (
                  <tr key={lot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{lot.coffee_record_id || 'N/A'}</td>
                    <td className="py-3 px-4">{lot.assessed_by}</td>
                    <td className="py-3 px-4 text-right">{Number(lot.quantity_kg).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(lot.unit_price_ugx)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(lot.total_amount_ugx)}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700">
                      {advanceAmount > 0 ? `-${formatCurrency(advanceAmount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-700">
                      {formatCurrency(finalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!canPay ? (
                        <div className="flex items-center justify-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          <span className="text-xs">Insufficient funds</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleProcessPayment(lot)}
                          disabled={processing === lot.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === lot.id ? 'Processing...' : 'Pay'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Payment</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Record ID:</span>
                  <span className="font-semibold text-gray-900">{confirmPayment.coffee_record_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Assessed By:</span>
                  <span className="font-semibold text-gray-900">{confirmPayment.assessed_by}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold text-gray-900">{Number(confirmPayment.quantity_kg).toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(confirmPayment.total_amount_ugx)}</span>
                </div>
                {confirmPayment.advanceAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Less Advance:</span>
                    <span className="font-semibold text-orange-700">-{formatCurrency(confirmPayment.advanceAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 bg-green-50 px-3 rounded">
                  <span className="text-gray-900 font-semibold">Net Payment:</span>
                  <span className="font-bold text-green-700 text-lg">
                    {formatCurrency(confirmPayment.finalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmPayment(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProcessPayment}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

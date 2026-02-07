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
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())
  const [confirmBulkPayment, setConfirmBulkPayment] = useState<any[] | null>(null)

  useEffect(() => {
    fetchCashBalanceAndAdvances()
  }, [])

  const fetchCashBalanceAndAdvances = async () => {
    try {
      const [balanceResult, transactionsResult, advancesResult] = await Promise.all([
        supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .single(),
        supabase
          .from('finance_cash_transactions')
          .select('transaction_type, amount, status'),
        supabase
          .from('supplier_advances')
          .select('supplier_id, amount_ugx, outstanding_ugx, is_closed')
          .eq('is_closed', false)
      ])

      let netBalance = 0

      if (balanceResult.data?.current_balance !== undefined) {
        netBalance = Number(balanceResult.data.current_balance)
      } else if (transactionsResult.data) {
        const totalCashIn = transactionsResult.data
          .filter((t: any) => ['DEPOSIT', 'ADVANCE_RECOVERY'].includes(t.transaction_type) && t.status === 'confirmed')
          .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

        const totalCashOut = transactionsResult.data
          .filter((t: any) => ['PAYMENT', 'EXPENSE'].includes(t.transaction_type) && t.status === 'confirmed')
          .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

        netBalance = totalCashIn - totalCashOut
      }

      setCashBalance(netBalance)

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
    const totalAmount = lot.kilograms * (lot.final_price || lot.suggested_price || 0)
    const advanceAmount = lot.supplier_id ? (supplierAdvances[lot.supplier_id] || 0) : 0
    const finalAmount = Math.max(0, totalAmount - advanceAmount)

    const netBalance = cashBalance
    const availableCash = Math.max(0, netBalance)
    const newNetBalance = netBalance - finalAmount
    const willBeOverdraft = newNetBalance < 0
    const overdraftAmount = willBeOverdraft ? Math.abs(newNetBalance) : 0

    setConfirmPayment({
      ...lot,
      totalAmount,
      advanceAmount,
      finalAmount,
      willBeOverdraft,
      overdraftAmount
    })
  }

  const confirmProcessPayment = async () => {
    if (!confirmPayment) return
    const lot = confirmPayment

    setConfirmPayment(null)

    try {
      setProcessing(lot.id)

      const { data: { user } } = await supabase.auth.getUser()
      const processedBy = user?.email || 'Finance'

      const { data: existingRecord, error: checkError } = await supabase
        .from('payment_records')
        .select('status')
        .eq('id', lot.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (!existingRecord) {
        throw new Error('Payment record not found')
      }

      if (existingRecord.status === 'Paid') {
        alert('This batch has already been paid')
        setProcessing(null)
        refetch()
        return
      }

      const { data: existingPayment } = await supabase
        .from('supplier_payments')
        .select('id')
        .eq('reference', lot.batch_number)
        .eq('is_duplicate', false)
        .maybeSingle()

      if (existingPayment) {
        alert('Payment for this batch already exists')
        setProcessing(null)
        refetch()
        return
      }

      const { error: updateError } = await supabase
        .from('payment_records')
        .update({
          status: 'Paid',
          amount_paid: lot.finalAmount,
          balance: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', lot.id)
        .eq('status', 'Pending')

      if (updateError) throw updateError

      const { error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          supplier_id: lot.supplier_id,
          method: 'CASH',
          status: 'POSTED',
          requested_by: processedBy,
          approved_by: processedBy,
          approved_at: new Date().toISOString(),
          gross_payable_ugx: lot.totalAmount,
          advance_recovered_ugx: lot.advanceAmount || 0,
          amount_paid_ugx: lot.finalAmount,
          reference: lot.batch_number,
          notes: `Coffee payment for ${lot.supplier_name} (${lot.supplier_id}) - ${lot.kilograms} kg @ ${lot.final_price || lot.suggested_price} UGX/kg`,
          is_duplicate: false
        })

      if (paymentError) throw paymentError

      if (lot.advanceAmount > 0 && lot.supplier_id) {
        const { error: advanceError } = await supabase
          .from('supplier_advances')
          .update({ is_closed: true, outstanding_ugx: 0 })
          .eq('supplier_id', lot.supplier_id)
          .eq('is_closed', false)

        if (advanceError) console.error('Error closing advances:', advanceError)
      }

      const { data: balanceRecord } = await supabase
        .from('finance_cash_balance')
        .select('id, current_balance')
        .eq('singleton', true)
        .maybeSingle()

      if (!balanceRecord) throw new Error('Cash balance record not found')

      const newBalance = balanceRecord.current_balance - lot.finalAmount

      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -lot.finalAmount,
          balance_after: newBalance,
          reference: lot.batch_number,
          notes: `Coffee payment for ${lot.supplier_name} - ${lot.kilograms} kg @ ${lot.final_price || lot.suggested_price} UGX/kg`,
          created_by: processedBy,
          status: 'confirmed',
          confirmed_by: processedBy,
          confirmed_at: new Date().toISOString()
        })

      if (transactionError) throw transactionError

      const { error: balanceError } = await supabase
        .from('finance_cash_balance')
        .update({
          current_balance: newBalance,
          last_updated: new Date().toISOString(),
          updated_by: processedBy
        })
        .eq('singleton', true)

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

  const handleSelectPayment = (lotId: string) => {
    const newSelected = new Set(selectedPayments)
    if (newSelected.has(lotId)) {
      newSelected.delete(lotId)
    } else {
      if (newSelected.size >= 10) {
        alert('You can only select up to 10 payments at once')
        return
      }
      newSelected.add(lotId)
    }
    setSelectedPayments(newSelected)
  }

  const handleBulkPayment = () => {
    const selectedLots = lots?.filter(lot => selectedPayments.has(lot.id)) || []

    const paymentsDetails = selectedLots.map(lot => {
      const totalAmount = lot.kilograms * (lot.final_price || lot.suggested_price || 0)
      const advanceAmount = lot.supplier_id ? (supplierAdvances[lot.supplier_id] || 0) : 0
      const finalAmount = Math.max(0, totalAmount - advanceAmount)

      return {
        ...lot,
        totalAmount,
        advanceAmount,
        finalAmount
      }
    })

    const totalFinalAmount = paymentsDetails.reduce((sum, p) => sum + p.finalAmount, 0)
    const newNetBalance = cashBalance - totalFinalAmount
    const willBeOverdraft = newNetBalance < 0
    const overdraftAmount = willBeOverdraft ? Math.abs(newNetBalance) : 0

    setConfirmBulkPayment(paymentsDetails.map(p => ({
      ...p,
      willBeOverdraft,
      overdraftAmount
    })))
  }

  const confirmBulkProcessPayment = async () => {
    if (!confirmBulkPayment) return

    setConfirmBulkPayment(null)

    try {
      setProcessing('bulk')

      const { data: { user } } = await supabase.auth.getUser()
      const processedBy = user?.email || 'Finance'

      const { data: balanceRecord, error: balanceError } = await supabase
        .from('finance_cash_balance')
        .select('id, current_balance')
        .eq('singleton', true)
        .maybeSingle()

      if (balanceError || !balanceRecord) {
        throw new Error('Cash balance record not found')
      }

      let runningBalance = balanceRecord.current_balance
      const successfulPayments: any[] = []
      const transactions: any[] = []

      for (const lot of confirmBulkPayment) {
        const { data: existingRecord, error: checkError } = await supabase
          .from('payment_records')
          .select('status')
          .eq('id', lot.id)
          .maybeSingle()

        if (checkError) throw checkError

        if (!existingRecord) {
          console.warn(`Payment record not found for batch ${lot.batch_number}`)
          continue
        }

        if (existingRecord.status === 'Paid') {
          console.warn(`Batch ${lot.batch_number} has already been paid`)
          continue
        }

        const { data: existingPayment } = await supabase
          .from('supplier_payments')
          .select('id')
          .eq('reference', lot.batch_number)
          .eq('is_duplicate', false)
          .maybeSingle()

        if (existingPayment) {
          console.warn(`Payment for batch ${lot.batch_number} already exists`)
          continue
        }

        const { error: updateError } = await supabase
          .from('payment_records')
          .update({
            status: 'Paid',
            amount_paid: lot.finalAmount,
            balance: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', lot.id)
          .eq('status', 'Pending')

        if (updateError) throw updateError

        const { error: paymentError } = await supabase
          .from('supplier_payments')
          .insert({
            supplier_id: lot.supplier_id,
            method: 'CASH',
            status: 'POSTED',
            requested_by: processedBy,
            approved_by: processedBy,
            approved_at: new Date().toISOString(),
            gross_payable_ugx: lot.totalAmount,
            advance_recovered_ugx: lot.advanceAmount || 0,
            amount_paid_ugx: lot.finalAmount,
            reference: lot.batch_number,
            notes: `Coffee payment for ${lot.supplier_name} (${lot.supplier_id}) - ${lot.kilograms} kg @ ${lot.final_price || lot.suggested_price} UGX/kg`,
            is_duplicate: false
          })

        if (paymentError) throw paymentError

        if (lot.advanceAmount > 0 && lot.supplier_id) {
          const { error: advanceError } = await supabase
            .from('supplier_advances')
            .update({ is_closed: true, outstanding_ugx: 0 })
            .eq('supplier_id', lot.supplier_id)
            .eq('is_closed', false)

          if (advanceError) console.error('Error closing advances:', advanceError)
        }

        runningBalance -= lot.finalAmount

        transactions.push({
          transaction_type: 'PAYMENT',
          amount: -lot.finalAmount,
          balance_after: runningBalance,
          reference: lot.batch_number,
          notes: `Coffee payment for ${lot.supplier_name} - ${lot.kilograms} kg @ ${lot.final_price || lot.suggested_price} UGX/kg`,
          created_by: processedBy,
          status: 'confirmed',
          confirmed_by: processedBy,
          confirmed_at: new Date().toISOString()
        })

        successfulPayments.push(lot)
      }

      if (transactions.length > 0) {
        const { error: transactionError } = await supabase
          .from('finance_cash_transactions')
          .insert(transactions)

        if (transactionError) throw transactionError

        const { error: updateBalanceError } = await supabase
          .from('finance_cash_balance')
          .update({
            current_balance: runningBalance,
            last_updated: new Date().toISOString(),
            updated_by: processedBy
          })
          .eq('singleton', true)

        if (updateBalanceError) throw updateBalanceError
      }

      setSelectedPayments(new Set())
      fetchCashBalanceAndAdvances()
      refetch()
      alert(`Successfully processed ${successfulPayments.length} payment(s)`)
    } catch (err: any) {
      console.error('Error processing bulk payments:', err)
      alert(`Failed to process bulk payments: ${err.message}`)
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

  const selectedLots = lots?.filter(lot => selectedPayments.has(lot.id)) || []
  const selectedTotal = selectedLots.reduce((sum, lot) => {
    const totalAmount = lot.kilograms * (lot.final_price || lot.suggested_price || 0)
    const advanceAmount = lot.supplier_id ? (supplierAdvances[lot.supplier_id] || 0) : 0
    const finalAmount = Math.max(0, totalAmount - advanceAmount)
    return sum + finalAmount
  }, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Coffee className="w-5 h-5 mr-2 text-brown-600" />
          Pending Coffee Payments
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            {cashBalance >= 0 ? 'Available Cash' : 'Overdraft'}
          </p>
          <p className={`text-lg font-bold ${cashBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(Math.abs(cashBalance))}
          </p>
        </div>
      </div>

      {selectedPayments.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">
                {selectedPayments.size} payment{selectedPayments.size !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-green-700 mt-1">
                Total: {formatCurrency(selectedTotal)}
              </p>
            </div>
            <button
              onClick={handleBulkPayment}
              disabled={processing !== null}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pay {selectedPayments.size} Selected
            </button>
          </div>
        </div>
      )}

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
                <th className="text-center py-3 px-4 font-semibold text-gray-700 w-12">
                  <input
                    type="checkbox"
                    checked={lots && selectedPayments.size === lots.length && lots.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = lots?.slice(0, 10).map(l => l.id) || []
                        setSelectedPayments(new Set(allIds))
                      } else {
                        setSelectedPayments(new Set())
                      }
                    }}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Batch #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Weight (kg)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Price/kg</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Advance</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Net Due</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const unitPrice = lot.final_price || lot.suggested_price || 0
                const totalAmount = lot.kilograms * unitPrice
                const advanceAmount = lot.supplier_id ? (supplierAdvances[lot.supplier_id] || 0) : 0
                const finalAmount = Math.max(0, totalAmount - advanceAmount)
                const isSelected = selectedPayments.has(lot.id)

                return (
                  <tr key={lot.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectPayment(lot.id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium">{lot.batch_number}</td>
                    <td className="py-3 px-4">{lot.supplier_name}</td>
                    <td className="py-3 px-4 text-right">{Number(lot.kilograms).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700">
                      {advanceAmount > 0 ? `-${formatCurrency(advanceAmount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-700">
                      {formatCurrency(finalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleProcessPayment(lot)}
                        disabled={processing !== null}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === lot.id ? 'Processing...' : 'Pay'}
                      </button>
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
                  <span className="text-gray-600">Batch Number:</span>
                  <span className="font-semibold text-gray-900">{confirmPayment.batch_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-semibold text-gray-900">{confirmPayment.supplier_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold text-gray-900">{confirmPayment.kilograms} kg</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(confirmPayment.totalAmount)}</span>
                </div>
                {confirmPayment.advanceAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Less: Advance:</span>
                    <span className="font-semibold text-orange-700">-{formatCurrency(confirmPayment.advanceAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 bg-green-50 px-4 rounded-lg">
                  <span className="text-gray-900 font-semibold">Net Payment:</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(confirmPayment.finalAmount)}</span>
                </div>
                {confirmPayment.willBeOverdraft && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Overdraft Warning</p>
                        <p className="text-sm text-orange-700 mt-1">
                          This payment will push you into overdraft of {formatCurrency(confirmPayment.overdraftAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmPayment(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProcessPayment}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmBulkPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Confirm Bulk Payment</h3>
              <p className="text-sm text-gray-600 mt-1">
                You are about to process {confirmBulkPayment.length} payment{confirmBulkPayment.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {confirmBulkPayment.map((payment, index) => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{payment.batch_number}</p>
                        <p className="text-sm text-gray-600">{payment.supplier_name}</p>
                      </div>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(payment.finalAmount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Quantity:</span>{' '}
                        <span className="font-medium">{payment.kilograms} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>{' '}
                        <span className="font-medium">{formatCurrency(payment.totalAmount)}</span>
                      </div>
                      {payment.advanceAmount > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Advance:</span>{' '}
                          <span className="font-medium text-orange-700">-{formatCurrency(payment.advanceAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">Total Payment Amount:</span>
                  <span className="text-2xl font-bold text-green-700">
                    {formatCurrency(confirmBulkPayment.reduce((sum, p) => sum + p.finalAmount, 0))}
                  </span>
                </div>
              </div>

              {confirmBulkPayment[0]?.willBeOverdraft && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900">Overdraft Warning</p>
                      <p className="text-sm text-orange-700 mt-1">
                        These payments will push you into overdraft of {formatCurrency(confirmBulkPayment[0].overdraftAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmBulkPayment(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkProcessPayment}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {processing === 'bulk' ? 'Processing...' : `Confirm ${confirmBulkPayment.length} Payment${confirmBulkPayment.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

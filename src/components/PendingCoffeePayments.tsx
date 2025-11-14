import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { Coffee, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'

interface CoffeeRecord {
  id: string
  batch_number: string
  supplier_name: string
  supplier_id: string
  kilograms: number
  bags: number
  coffee_type: string
  date: string
  status: string
  created_at: string
  created_by: string
}

interface QualityAssessment {
  id: string
  suggested_price: number
  assessed_by: string
  moisture?: number
  group1_defects?: number
  group2_defects?: number
  store_record_id: string
}

interface PendingPayment extends CoffeeRecord {
  quality_assessment?: QualityAssessment
  calculated_amount: number
  has_advance: boolean
  advance_amount: number
}

export const PendingCoffeePayments = () => {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [cashBalance, setCashBalance] = useState(0)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      setLoading(true)

      const [coffeeRecordsResult, paidBatchesResult, qualityAssessmentsResult, advancesResult, balanceResult] = await Promise.all([
        supabase
          .from('coffee_records')
          .select('id, batch_number, supplier_name, supplier_id, kilograms, bags, coffee_type, date, status, created_at, created_by')
          .in('status', ['pending', 'assessed', 'submitted_to_finance']),

        supabase
          .from('payment_records')
          .select('batch_number')
          .eq('status', 'Paid'),

        supabase
          .from('quality_assessments')
          .select('id, suggested_price, assessed_by, moisture, group1_defects, group2_defects, store_record_id'),

        supabase
          .from('supplier_advances')
          .select('supplier_id, amount_ugx, outstanding_ugx, is_closed'),

        supabase
          .from('finance_cash_balance')
          .select('current_balance')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      if (coffeeRecordsResult.error) throw coffeeRecordsResult.error
      if (paidBatchesResult.error) throw paidBatchesResult.error
      if (qualityAssessmentsResult.error) throw qualityAssessmentsResult.error
      if (advancesResult.error) throw advancesResult.error

      const paidBatches = new Set(paidBatchesResult.data?.map((p: any) => p.batch_number) || [])
      const unpaidRecords = coffeeRecordsResult.data?.filter((r: any) => !paidBatches.has(r.batch_number)) || []

      const pendingWithDetails: PendingPayment[] = unpaidRecords.map((record: any) => {
        const quality = qualityAssessmentsResult.data?.find((q: any) => q.store_record_id === record.id)
        const pricePerKg = quality?.suggested_price || 0
        const calculatedAmount = record.kilograms * pricePerKg

        const activeAdvances = advancesResult.data?.filter(
          (a: any) => a.supplier_id === record.supplier_id && !a.is_closed
        ) || []
        const totalAdvance = activeAdvances.reduce((sum: number, a: any) => sum + Number(a.outstanding_ugx || a.amount_ugx), 0)

        return {
          ...record,
          quality_assessment: quality,
          calculated_amount: calculatedAmount,
          has_advance: totalAdvance > 0,
          advance_amount: totalAdvance
        }
      })

      setPayments(pendingWithDetails)
      setCashBalance(balanceResult.data?.current_balance || 0)
    } catch (error: any) {
      console.error('Error fetching pending payments:', error)
      alert(`Failed to fetch pending payments: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayment = async (payment: PendingPayment) => {
    const finalAmount = Math.max(0, payment.calculated_amount - payment.advance_amount)

    if (cashBalance < finalAmount) {
      alert(`Insufficient cash balance. Available: ${formatCurrency(cashBalance)}, Required: ${formatCurrency(finalAmount)}`)
      return
    }

    if (!confirm(`Process payment of ${formatCurrency(finalAmount)} to ${payment.supplier_name}?`)) {
      return
    }

    try {
      setProcessing(payment.id)

      const { data: { user } } = await supabase.auth.getUser()
      const processedBy = user?.email || 'Finance'

      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          supplier: payment.supplier_name,
          supplier_id: payment.supplier_id,
          amount: finalAmount,
          status: 'Paid',
          method: 'Cash',
          date: new Date().toISOString().split('T')[0],
          batch_number: payment.batch_number,
          quality_assessment_id: payment.quality_assessment?.id
        })

      if (paymentError) throw paymentError

      const { error: recordError } = await supabase
        .from('coffee_records')
        .update({ status: 'inventory' })
        .eq('id', payment.id)

      if (recordError) throw recordError

      if (payment.has_advance) {
        const { error: advanceError } = await supabase
          .from('supplier_advances')
          .update({ is_closed: true, outstanding_ugx: 0 })
          .eq('supplier_id', payment.supplier_id)
          .eq('is_closed', false)

        if (advanceError) throw advanceError
      }

      const newBalance = cashBalance - finalAmount

      const { error: transactionError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -finalAmount,
          balance_after: newBalance,
          reference: payment.batch_number,
          notes: `Payment to ${payment.supplier_name} for batch ${payment.batch_number}`,
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

      alert('Payment processed successfully')
      fetchPendingPayments()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      alert(`Failed to process payment: ${error.message}`)
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
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
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

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">No pending payments</p>
          <p className="text-sm text-gray-500 mt-1">All supplier payments are up to date</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
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
              {payments.map((payment) => {
                const finalAmount = Math.max(0, payment.calculated_amount - payment.advance_amount)
                const canPay = cashBalance >= finalAmount

                return (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{payment.batch_number}</td>
                    <td className="py-3 px-4">{payment.supplier_name}</td>
                    <td className="py-3 px-4 text-right">{payment.kilograms.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(payment.quality_assessment?.suggested_price || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(payment.calculated_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700">
                      {payment.has_advance ? `-${formatCurrency(payment.advance_amount)}` : '-'}
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
                          onClick={() => handleProcessPayment(payment)}
                          disabled={processing === payment.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === payment.id ? 'Processing...' : 'Pay'}
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
    </div>
  )
}

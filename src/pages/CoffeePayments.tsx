import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Coffee, DollarSign, CheckCircle, Clock, Download, Search } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface CoffeeLot {
  id: string
  quality_assessment_id?: string
  coffee_record_id?: string
  supplier_id?: string
  assessed_by: string
  assessed_at: string
  quality_json: any
  unit_price_ugx: number
  quantity_kg: number
  total_amount_ugx: number
  finance_status: string
  finance_notes?: string
  created_at: string
  updated_at: string
}

export const CoffeePayments = () => {
  const [lots, setLots] = useState<CoffeeLot[]>([])
  const [filteredLots, setFilteredLots] = useState<CoffeeLot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('READY_FOR_FINANCE')
  const [selectedLot, setSelectedLot] = useState<CoffeeLot | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchLots()
  }, [statusFilter])

  useEffect(() => {
    filterLots()
  }, [lots, searchTerm])

  const fetchLots = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('coffee_records')
        .select('*')

      if (statusFilter === 'READY_FOR_FINANCE') {
        query = query.eq('status', 'submitted_to_finance')
      } else if (statusFilter === 'PAID') {
        query = query.eq('status', 'inventory')
      } else if (statusFilter === 'APPROVED_FOR_PAYMENT') {
        query = query.eq('status', 'approved')
      } else if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data: coffeeRecords, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      if (!coffeeRecords || coffeeRecords.length === 0) {
        setLots([])
        return
      }

      const batchNumbers = coffeeRecords.map((r: any) => r.batch_number)

      const { data: assessments } = await supabase
        .from('quality_assessments')
        .select('batch_number, final_price, suggested_price, assessed_by, date_assessed')
        .in('batch_number', batchNumbers)

      const assessmentMap = new Map()
      if (assessments) {
        assessments.forEach((a: any) => {
          assessmentMap.set(a.batch_number, a)
        })
      }

      const transformed = coffeeRecords.map((record: any) => {
        const assessment = assessmentMap.get(record.batch_number)
        const unitPrice = assessment?.final_price || assessment?.suggested_price || 0
        return {
          id: record.id,
          coffee_record_id: record.batch_number,
          supplier_id: record.supplier_id,
          assessed_by: assessment?.assessed_by || 'N/A',
          assessed_at: assessment?.date_assessed || record.date,
          quantity_kg: Number(record.kilograms),
          unit_price_ugx: unitPrice,
          total_amount_ugx: Number(record.kilograms) * unitPrice,
          finance_status: record.status === 'inventory' ? 'PAID' : record.status === 'submitted_to_finance' ? 'READY_FOR_FINANCE' : 'APPROVED_FOR_PAYMENT',
          created_at: record.created_at,
          updated_at: record.updated_at
        }
      })

      setLots(transformed)
    } catch (error: any) {
      console.error('Error fetching coffee lots:', error)
      alert('Failed to fetch coffee lots')
    } finally {
      setLoading(false)
    }
  }

  const filterLots = () => {
    let filtered = lots

    if (searchTerm) {
      filtered = filtered.filter(lot =>
        lot.coffee_record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.assessed_by?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLots(filtered)
  }

  const handleProcessPayment = (lot: CoffeeLot) => {
    setSelectedLot(lot)
    setPaymentAmount(lot.total_amount_ugx.toString())
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedLot) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    try {
      setProcessing(true)

      const { error: updateError } = await supabase
        .from('coffee_records')
        .update({
          status: 'inventory',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLot.id)

      if (updateError) throw updateError

      const { data: { user } } = await supabase.auth.getUser()
      const processedBy = user?.email || 'Finance'

      const { error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          lot_id: selectedLot.id,
          supplier_id: selectedLot.supplier_id,
          method: paymentMethod.toUpperCase(),
          status: 'POSTED',
          requested_by: processedBy,
          approved_by: processedBy,
          approved_at: new Date().toISOString(),
          gross_payable_ugx: amount,
          advance_recovered_ugx: 0,
          amount_paid_ugx: amount,
          reference: selectedLot.coffee_record_id || '',
          notes: notes || null
        })

      if (paymentError) throw paymentError

      const { error: cashError } = await supabase
        .from('finance_cash_transactions')
        .insert({
          transaction_type: 'PAYMENT',
          amount: -amount,
          reference: selectedLot.coffee_record_id,
          notes: `Coffee payment - ${selectedLot.quantity_kg}kg @ ${selectedLot.unit_price_ugx} UGX/kg`,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (cashError) throw cashError

      alert('Coffee payment processed successfully')
      setShowPaymentModal(false)
      resetForm()
      fetchLots()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      alert(`Failed to process payment: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedLot(null)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setReferenceNumber('')
    setNotes('')
  }

  const handleExport = () => {
    const exportData = filteredLots.map(lot => ({
      'Record ID': lot.coffee_record_id || 'N/A',
      'Assessed By': lot.assessed_by,
      'Quantity (kg)': lot.quantity_kg,
      'Unit Price': lot.unit_price_ugx,
      'Total Amount': lot.total_amount_ugx,
      'Status': lot.finance_status,
      'Date': formatDate(lot.assessed_at)
    }))
    exportToCSV(exportData, `coffee-lots-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading coffee lots...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coffee Payments</h1>
          <p className="text-gray-600">Manage coffee lot payments to suppliers</p>
        </div>
        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
                placeholder="Search by supplier or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="READY_FOR_FINANCE">Ready for Finance</option>
              <option value="APPROVED_FOR_PAYMENT">Approved for Payment</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Record ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Assessed By</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity (kg)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No coffee lots ready for payment
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => (
                  <tr key={lot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{lot.coffee_record_id || 'N/A'}</td>
                    <td className="py-3 px-4">{lot.assessed_by}</td>
                    <td className="py-3 px-4 text-right">{lot.quantity_kg.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(lot.unit_price_ugx)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(lot.total_amount_ugx)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lot.finance_status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : lot.finance_status === 'APPROVED_FOR_PAYMENT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lot.finance_status === 'PAID' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {lot.finance_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(lot.assessed_at)}</td>
                    <td className="py-3 px-4 text-center">
                      {lot.finance_status === 'READY_FOR_FINANCE' && (
                        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator', 'Finance']}>
                          <button
                            onClick={() => handleProcessPayment(lot)}
                            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
                          >
                            Process Payment
                          </button>
                        </PermissionGate>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && selectedLot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 rounded-t-2xl">
              <h3 className="text-xl font-semibold text-white">Process Coffee Payment</h3>
              <p className="text-emerald-100 text-sm mt-1">Record: {selectedLot.coffee_record_id || 'N/A'}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-semibold">{selectedLot.quantity_kg.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unit Price</p>
                    <p className="font-semibold">{formatCurrency(selectedLot.unit_price_ugx)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedLot.total_amount_ugx)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Receipt, transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  resetForm()
                }}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={processing || !paymentAmount}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

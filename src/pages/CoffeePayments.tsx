import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Coffee, DollarSign, CheckCircle, Clock, Download, Search } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface PaymentRecord {
  id: string
  supplier: string
  amount: number
  amount_paid: number
  balance: number
  status: string
  method: string
  batch_number?: string
  date: string
  quality_assessment_id?: string
  created_at: string
  updated_at: string
}

export const CoffeePayments = () => {
  const [lots, setLots] = useState<PaymentRecord[]>([])
  const [filteredLots, setFilteredLots] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Pending')
  const [selectedLot, setSelectedLot] = useState<PaymentRecord | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchLots()
  }, [])

  useEffect(() => {
    filterLots()
  }, [lots, searchTerm, statusFilter])

  const fetchLots = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setLots(data || [])
    } catch (error: any) {
      console.error('Error fetching payment records:', error)
      alert('Failed to fetch payment records')
    } finally {
      setLoading(false)
    }
  }

  const filterLots = () => {
    let filtered = lots

    if (statusFilter) {
      filtered = filtered.filter(lot => lot.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(lot =>
        lot.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLots(filtered)
  }

  const handleProcessPayment = (lot: PaymentRecord) => {
    setSelectedLot(lot)
    setPaymentAmount(lot.balance.toString())
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

      const newAmountPaid = Number(selectedLot.amount_paid || 0) + amount
      const newBalance = Number(selectedLot.amount) - newAmountPaid
      const newStatus = newBalance <= 0 ? 'Paid' : 'Partial'

      const { error: updateError } = await supabase
        .from('payment_records')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
          method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLot.id)

      if (updateError) throw updateError

      const { error: transactionError } = await supabase
        .from('finance_transactions')
        .insert({
          type: 'Coffee Payment',
          description: `Coffee payment to ${selectedLot.supplier} - ${selectedLot.batch_number || 'N/A'}`,
          amount: amount,
          date: new Date().toISOString().split('T')[0]
        })

      if (transactionError) throw transactionError

      alert('Payment processed successfully')
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
      Supplier: lot.supplier,
      'Batch Number': lot.batch_number || 'N/A',
      'Total Amount': lot.amount,
      'Amount Paid': lot.amount_paid || 0,
      'Balance': lot.balance,
      'Status': lot.status,
      'Method': lot.method,
      'Date': formatDate(lot.date)
    }))
    exportToCSV(exportData, `coffee-payments-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
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
              <option value="Pending">Pending</option>
              <option value="Partial">Partially Paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Batch</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Paid</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Balance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    No payment records found
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => (
                  <tr key={lot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{lot.supplier}</td>
                    <td className="py-3 px-4">{lot.batch_number || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(lot.amount)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(lot.amount_paid || 0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(lot.balance)}</td>
                    <td className="py-3 px-4">{lot.method || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lot.status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : lot.status === 'Partial'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lot.status === 'Paid' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {lot.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(lot.date)}</td>
                    <td className="py-3 px-4 text-center">
                      {lot.status === 'Pending' && (
                        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator', 'Supervisor']}>
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
              <p className="text-emerald-100 text-sm mt-1">{selectedLot.supplier}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-semibold">{formatCurrency(selectedLot.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Already Paid</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(selectedLot.amount_paid || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Balance Payable</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedLot.balance)}</p>
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

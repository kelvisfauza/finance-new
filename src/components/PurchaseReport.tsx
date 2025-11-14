import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { ShoppingCart, Download, Calendar, TrendingUp } from 'lucide-react'

interface Purchase {
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
  price_per_kg?: number
  total_amount?: number
}

export const PurchaseReport = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchPurchases = async () => {
    try {
      setLoading(true)

      const [recordsResult, assessmentsResult, paymentsResult] = await Promise.all([
        supabase
          .from('coffee_records')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),

        supabase
          .from('quality_assessments')
          .select('store_record_id, suggested_price'),

        supabase
          .from('payment_records')
          .select('batch_number, amount')
          .eq('status', 'Paid')
      ])

      if (recordsResult.error) throw recordsResult.error

      const qualityMap = new Map(
        assessmentsResult.data?.map((a: any) => [a.store_record_id, a.suggested_price]) || []
      )

      const paymentMap = new Map(
        paymentsResult.data?.map((p: any) => [p.batch_number, p.amount]) || []
      )

      const purchasesWithPricing: Purchase[] = (recordsResult.data || []).map((record: any) => {
        const pricePerKg = Number(qualityMap.get(record.id)) || 0
        const totalAmount = Number(paymentMap.get(record.batch_number)) || (Number(record.kilograms) * pricePerKg)

        return {
          ...record,
          price_per_kg: pricePerKg,
          total_amount: totalAmount
        }
      })

      setPurchases(purchasesWithPricing)
      setFilteredPurchases(purchasesWithPricing)
    } catch (error: any) {
      console.error('Error fetching purchases:', error)
      alert('Failed to fetch purchase data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = purchases

    if (supplierFilter) {
      filtered = filtered.filter(p =>
        p.supplier_name.toLowerCase().includes(supplierFilter.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    setFilteredPurchases(filtered)
  }, [purchases, supplierFilter, statusFilter])

  const handleExport = () => {
    const exportData = filteredPurchases.map(p => ({
      Date: p.date,
      Batch: p.batch_number,
      Supplier: p.supplier_name,
      Type: p.coffee_type,
      'Weight (kg)': p.kilograms,
      Bags: p.bags,
      'Price/kg': p.price_per_kg || 0,
      'Total Amount': p.total_amount || 0,
      Status: p.status,
      'Created By': p.created_by
    }))

    exportToCSV(exportData, `purchases-${startDate}-to-${endDate}`)
  }

  const totalKilograms = filteredPurchases.reduce((sum, p) => sum + Number(p.kilograms), 0)
  const totalBags = filteredPurchases.reduce((sum, p) => sum + Number(p.bags), 0)
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
  const averagePrice = totalKilograms > 0 ? totalAmount / totalKilograms : 0

  const uniqueSuppliers = new Set(filteredPurchases.map(p => p.supplier_name))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="w-6 h-6 mr-2 text-green-600" />
            Purchase Report
          </h3>
          {filteredPurchases.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={fetchPurchases}
          disabled={loading}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
        >
          {loading ? 'Loading Purchases...' : 'Load Purchases'}
        </button>

        {purchases.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Supplier</label>
              <input
                type="text"
                placeholder="Search supplier..."
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="assessed">Assessed</option>
                <option value="submitted_to_finance">Submitted to Finance</option>
                <option value="inventory">In Inventory</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {filteredPurchases.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Weight</p>
              <p className="text-2xl font-bold text-gray-900">{totalKilograms.toLocaleString()} kg</p>
              <p className="text-sm text-gray-500 mt-1">{totalBags.toLocaleString()} bags</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredPurchases.length} purchases</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Average Price</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(averagePrice)}/kg</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Per kilogram
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">Suppliers</p>
              <p className="text-2xl font-bold text-purple-700">{uniqueSuppliers.size}</p>
              <p className="text-sm text-gray-500 mt-1">Unique suppliers</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Purchase Details</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Batch #</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Weight (kg)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Bags</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Price/kg</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{purchase.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">{purchase.batch_number}</td>
                      <td className="py-3 px-4 text-sm">{purchase.supplier_name}</td>
                      <td className="py-3 px-4 text-sm">{purchase.coffee_type}</td>
                      <td className="py-3 px-4 text-right">{purchase.kilograms.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{purchase.bags}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(purchase.price_per_kg || 0)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-700">
                        {formatCurrency(purchase.total_amount || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          purchase.status === 'inventory'
                            ? 'bg-green-100 text-green-800'
                            : purchase.status === 'submitted_to_finance'
                            ? 'bg-blue-100 text-blue-800'
                            : purchase.status === 'assessed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {purchase.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

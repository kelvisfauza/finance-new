import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchSupplierAdvances, FirestoreAdvance } from '../lib/firestoreQueries'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { HandCoins, Download, Search, CheckCircle, Clock } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface Advance {
  id: string
  supplier_name: string
  amount: number
  recovered: number
  balance: number
  reference: string
  notes: string
  status: string
  created_at: string
  cleared_at: string | null
  source: 'supabase' | 'firestore'
}

export const SupplierAdvances = () => {
  const [advances, setAdvances] = useState<Advance[]>([])
  const [filteredAdvances, setFilteredAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Pending')

  useEffect(() => {
    fetchAdvances()
  }, [])

  useEffect(() => {
    filterAdvances()
  }, [advances, searchTerm, statusFilter])

  const fetchAdvances = async () => {
    try {
      setLoading(true)

      const [supabaseData, firestoreData] = await Promise.all([
        supabase
          .from('finance_advances')
          .select('*')
          .order('created_at', { ascending: false}),
        fetchSupplierAdvances()
      ])

      if (supabaseData.error) throw supabaseData.error

      const supabaseAdvances: Advance[] = (supabaseData.data || []).map((item: any) => ({
        id: item.id,
        supplier_name: item.reference || 'Unknown',
        amount: Number(item.amount || 0),
        recovered: 0,
        balance: Number(item.amount || 0),
        reference: item.reference || '',
        notes: item.notes || '',
        status: item.status || 'Pending',
        created_at: item.created_at,
        cleared_at: item.cleared_at,
        source: 'supabase' as const
      }))

      const firestoreAdvances: Advance[] = firestoreData.map((item: FirestoreAdvance) => ({
        id: item.id,
        supplier_name: item.supplier_name,
        amount: item.amount,
        recovered: item.recovered,
        balance: item.balance,
        reference: `FS-${item.supplier_id.slice(0, 8)}`,
        notes: item.notes || '',
        status: item.status === 'active' ? 'Pending' : 'Cleared',
        created_at: item.created_at.toISOString(),
        cleared_at: item.status === 'active' ? null : item.updated_at.toISOString(),
        source: 'firestore' as const
      }))

      const combinedAdvances = [...supabaseAdvances, ...firestoreAdvances]
      combinedAdvances.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setAdvances(combinedAdvances)
    } catch (error: any) {
      console.error('Error fetching advances:', error)
      alert('Failed to fetch advances')
    } finally {
      setLoading(false)
    }
  }

  const filterAdvances = () => {
    let filtered = advances

    if (statusFilter) {
      filtered = filtered.filter(advance => advance.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(advance =>
        advance.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advance.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advance.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAdvances(filtered)
  }

  const handleExport = () => {
    const exportData = filteredAdvances.map(advance => ({
      Supplier: advance.supplier_name,
      Reference: advance.reference,
      'Total Amount': advance.amount,
      'Recovered': advance.recovered,
      'Balance': advance.balance,
      Status: advance.status,
      Source: advance.source,
      Notes: advance.notes || 'N/A',
      'Created Date': formatDate(advance.created_at),
      'Cleared Date': advance.cleared_at ? formatDate(advance.cleared_at) : 'Not cleared'
    }))
    exportToCSV(exportData, `supplier-advances-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  const totalPending = advances
    .filter(a => a.status === 'Pending')
    .reduce((sum, a) => sum + Number(a.balance), 0)

  const totalCleared = advances
    .filter(a => a.status === 'Cleared')
    .reduce((sum, a) => sum + Number(a.amount), 0)

  const totalRecovered = advances
    .reduce((sum, a) => sum + Number(a.recovered), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advances...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Advances</h1>
          <p className="text-gray-600">Manage supplier advance payments</p>
        </div>
        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Export
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Pending</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrency(totalPending)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {advances.filter(a => a.status === 'Pending').length} advances
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 text-orange-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Cleared</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(totalCleared)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {advances.filter(a => a.status === 'Cleared').length} advances
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Recovered</p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(totalRecovered)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                From all advances
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <HandCoins className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by reference or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Supplier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Recovered</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Balance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No advances found
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{advance.supplier_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{advance.reference}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(advance.amount)}</td>
                    <td className="py-3 px-4 text-right text-green-700">{formatCurrency(advance.recovered)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-orange-700">{formatCurrency(advance.balance)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        advance.status === 'Cleared'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {advance.status === 'Cleared' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {advance.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        advance.source === 'firestore'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {advance.source === 'firestore' ? 'Firestore' : 'Supabase'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatDate(advance.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

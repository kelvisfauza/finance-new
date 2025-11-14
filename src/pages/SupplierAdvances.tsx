import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { HandCoins, Download, Search, CheckCircle, Clock } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface Advance {
  id: string
  amount: number
  reference: string
  notes: string
  status: string
  created_at: string
  cleared_at: string | null
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
      const { data, error } = await supabase
        .from('finance_advances')
        .select('*')
        .order('created_at', { ascending: false})

      if (error) throw error

      setAdvances(data || [])
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
        advance.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advance.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAdvances(filtered)
  }

  const handleExport = () => {
    const exportData = filteredAdvances.map(advance => ({
      Reference: advance.reference,
      Amount: advance.amount,
      Status: advance.status,
      Notes: advance.notes || 'N/A',
      'Created Date': formatDate(advance.created_at),
      'Cleared Date': advance.cleared_at ? formatDate(advance.cleared_at) : 'Not cleared'
    }))
    exportToCSV(exportData, `supplier-advances-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  const totalPending = advances
    .filter(a => a.status === 'Pending')
    .reduce((sum, a) => sum + Number(a.amount), 0)

  const totalCleared = advances
    .filter(a => a.status === 'Cleared')
    .reduce((sum, a) => sum + Number(a.amount), 0)

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
              <p className="text-sm font-medium text-gray-600 mb-1">Total Advances</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalPending + totalCleared)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All time
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700">
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Cleared</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No advances found
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{advance.reference}</td>
                    <td className="py-3 px-4 text-right font-semibold text-orange-700">{formatCurrency(advance.amount)}</td>
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
                    <td className="py-3 px-4 text-sm text-gray-600">{advance.notes || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(advance.created_at)}</td>
                    <td className="py-3 px-4 text-sm">
                      {advance.cleared_at ? formatDate(advance.cleared_at) : (
                        <span className="text-gray-400">Not cleared</span>
                      )}
                    </td>
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

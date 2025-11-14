import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate } from '../lib/utils'
import { HandCoins, Plus } from 'lucide-react'

export const SupplierAdvances = () => {
  const [advances, setAdvances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdvances()
  }, [])

  const fetchAdvances = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_advances')
        .select(`
          *,
          suppliers:supplier_id (name, code)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdvances(data || [])
    } catch (error: any) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Advances</h1>
          <p className="text-gray-600">Manage supplier advance payments</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus className="w-5 h-5 mr-2" />
          Give Advance
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          <HandCoins className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Supplier Advances Management</p>
          <p className="text-sm">Track advances given to suppliers and recoveries</p>
        </div>
      </div>
    </div>
  )
}

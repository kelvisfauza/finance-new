import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { FileText, CheckCircle, Clock, XCircle, Download, Search } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface Requisition {
  id: string
  type: string
  title: string
  description?: string
  amount: number
  date?: string
  daterequested: string
  category?: string
  status: string
  priority: string
  department: string
  requestedby: string
  created_at: string
  updated_at?: string
  details?: any
}

export const Requisitions = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [filteredRequisitions, setFilteredRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Pending')
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRequisitions()
  }, [])

  useEffect(() => {
    filterRequisitions()
  }, [requisitions, searchTerm, statusFilter])

  const fetchRequisitions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Requisition')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequisitions(data || [])
    } catch (error: any) {
      console.error('Error fetching requisitions:', error)
      alert('Failed to fetch requisitions')
    } finally {
      setLoading(false)
    }
  }

  const filterRequisitions = () => {
    let filtered = requisitions

    if (statusFilter) {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestedby?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRequisitions(filtered)
  }

  const handleApprove = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setShowModal(true)
  }

  const handleReject = async (requisition: Requisition) => {
    if (!confirm(`Are you sure you want to reject this requisition: ${requisition.title}?`)) return

    try {
      setProcessing(true)

      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'Rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requisition.id)

      if (error) throw error

      alert('Requisition rejected')
      fetchRequisitions()
    } catch (error: any) {
      console.error('Error rejecting requisition:', error)
      alert(`Failed to reject requisition: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmApproval = async () => {
    if (!selectedRequisition) return

    try {
      setProcessing(true)

      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({
          status: 'Approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequisition.id)

      if (updateError) throw updateError

      const { error: transactionError } = await supabase
        .from('finance_transactions')
        .insert({
          type: 'Requisition',
          description: selectedRequisition.title,
          amount: selectedRequisition.amount,
          date: new Date().toISOString().split('T')[0]
        })

      if (transactionError) throw transactionError

      alert('Requisition approved successfully')
      setShowModal(false)
      setSelectedRequisition(null)
      fetchRequisitions()
    } catch (error: any) {
      console.error('Error approving requisition:', error)
      alert(`Failed to approve requisition: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredRequisitions.map(req => ({
      Title: req.title,
      Amount: req.amount,
      Status: req.status,
      Priority: req.priority,
      Department: req.department,
      RequestedBy: req.requestedby,
      DateRequested: req.daterequested
    }))
    exportToCSV(exportData, `requisitions-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requisitions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Requisitions</h1>
          <p className="text-gray-600">Review and approve purchase requisitions</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title, department, or requester..."
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
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Requested By</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No requisitions found
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((requisition) => (
                  <tr key={requisition.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{requisition.title}</td>
                    <td className="py-3 px-4">{requisition.department}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{requisition.requestedby}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        requisition.priority === 'Urgent'
                          ? 'bg-red-100 text-red-800'
                          : requisition.priority === 'High'
                          ? 'bg-orange-100 text-orange-800'
                          : requisition.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {requisition.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(requisition.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        requisition.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : requisition.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {requisition.status === 'Approved' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : requisition.status === 'Rejected' ? (
                          <XCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {requisition.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{requisition.daterequested}</td>
                    <td className="py-3 px-4 text-center">
                      {requisition.status === 'Pending' && (
                        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApprove(requisition)}
                              disabled={processing}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(requisition)}
                              disabled={processing}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
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

      {showModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 rounded-t-2xl">
              <h3 className="text-xl font-semibold text-white">Approve Requisition</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Title</p>
                    <p className="font-semibold">{selectedRequisition.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Department</p>
                    <p className="font-semibold">{selectedRequisition.department}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Requested By</p>
                    <p className="font-semibold">{selectedRequisition.requestedby}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Priority</p>
                    <p className="font-semibold">{selectedRequisition.priority}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Amount</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(selectedRequisition.amount)}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to approve this requisition? This action cannot be undone.
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequisition(null)
                }}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

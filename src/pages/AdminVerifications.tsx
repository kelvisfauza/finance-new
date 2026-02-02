import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Plus, Search, Edit2, Ban, Download, QrCode, ExternalLink, FileText, User, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

interface Verification {
  id: string
  code: string
  type: 'employee_id' | 'document'
  subtype: string
  status: 'verified' | 'expired' | 'revoked'
  issued_to_name: string
  employee_no: string | null
  department: string | null
  issued_at: string
  valid_until: string | null
  created_at: string
}

export const AdminVerifications = () => {
  const { user } = useAuth()
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'employee_id' | 'document'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'expired' | 'revoked'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null)

  useEffect(() => {
    fetchVerifications()
  }, [])

  const fetchVerifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVerifications(data || [])
    } catch (error) {
      console.error('Error fetching verifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (id: string, reason: string) => {
    try {
      const verification = verifications.find(v => v.id === id)
      if (!verification) return

      const { error } = await supabase
        .from('verifications')
        .update({
          status: 'revoked',
          revoked_reason: reason
        })
        .eq('id', id)

      if (error) throw error

      await supabase.from('verification_audit_logs').insert({
        action: 'revoke',
        code: verification.code,
        admin_user: user?.id,
        admin_email: user?.email || '',
        details: { reason }
      })

      fetchVerifications()
      setShowRevokeModal(false)
      setSelectedVerification(null)
    } catch (error) {
      console.error('Error revoking verification:', error)
      alert('Failed to revoke verification')
    }
  }

  const getQRCodeUrl = (code: string) => {
    const baseUrl = window.location.origin
    const verifyUrl = `${baseUrl}/verify/${code}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`
  }

  const downloadQRCode = async (code: string) => {
    const qrUrl = getQRCodeUrl(code)
    try {
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QR-${code}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading QR code:', error)
      alert('Failed to download QR code')
    }
  }

  const filteredVerifications = verifications.filter(v => {
    const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.issued_to_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (v.employee_no && v.employee_no.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = filterType === 'all' || v.type === filterType
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Verified</span>
      case 'expired':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Expired</span>
      case 'revoked':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Revoked</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verification Management</h1>
            <p className="text-gray-600">Manage employee IDs and document verifications</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by code, name, or employee number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="employee_id">Employee ID</option>
            <option value="document">Document</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredVerifications.length} of {verifications.length} verifications
          </p>
          <Link
            to="/admin/verifications/logs"
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
          >
            View Audit Logs
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No verifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Valid Until</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map((verification) => (
                  <tr key={verification.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {verification.type === 'employee_id' ? (
                          <User className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-mono text-sm font-semibold">{verification.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{verification.subtype}</td>
                    <td className="py-3 px-4 text-sm font-medium">{verification.issued_to_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{verification.department}</td>
                    <td className="py-3 px-4">{getStatusBadge(verification.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {verification.valid_until ? format(new Date(verification.valid_until), 'PP') : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/verify/${verification.code}`, '_blank')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="View Public Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadQRCode(verification.code)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Download QR Code"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {verification.status !== 'revoked' && (
                          <button
                            onClick={() => {
                              setSelectedVerification(verification)
                              setShowRevokeModal(true)
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Revoke"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateVerificationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchVerifications()
          }}
        />
      )}

      {showRevokeModal && selectedVerification && (
        <RevokeModal
          verification={selectedVerification}
          onClose={() => {
            setShowRevokeModal(false)
            setSelectedVerification(null)
          }}
          onRevoke={(reason) => handleRevoke(selectedVerification.id, reason)}
        />
      )}
    </div>
  )
}

const CreateVerificationModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    code: '',
    type: 'employee_id' as 'employee_id' | 'document',
    subtype: '',
    issued_to_name: '',
    employee_no: '',
    position: '',
    department: '',
    workstation: '',
    reference_no: '',
    valid_until: '',
    meta: '{}'
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let meta = {}
      try {
        if (formData.meta.trim()) {
          meta = JSON.parse(formData.meta)
        }
      } catch (e) {
        alert('Invalid JSON in metadata field')
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase
        .from('verifications')
        .insert({
          code: formData.code.toUpperCase(),
          type: formData.type,
          subtype: formData.subtype,
          status: 'verified',
          issued_to_name: formData.issued_to_name,
          employee_no: formData.employee_no || null,
          position: formData.position || null,
          department: formData.department || null,
          workstation: formData.workstation || null,
          reference_no: formData.reference_no || null,
          valid_until: formData.valid_until || null,
          meta,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('verification_audit_logs').insert({
        action: 'create',
        code: formData.code.toUpperCase(),
        admin_user: user?.id,
        admin_email: user?.email || '',
        details: { type: formData.type, subtype: formData.subtype }
      })

      onSuccess()
    } catch (error: any) {
      console.error('Error creating verification:', error)
      alert(error.message || 'Failed to create verification')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Verification</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="GPCF-TRD-0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="employee_id">Employee ID</option>
                <option value="document">Document</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtype *
            </label>
            <input
              type="text"
              value={formData.subtype}
              onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
              placeholder="e.g., Employee ID Card, Salary Letter, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issued To Name *
            </label>
            <input
              type="text"
              value={formData.issued_to_name}
              onChange={(e) => setFormData({ ...formData, issued_to_name: e.target.value })}
              placeholder="Full Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Number
              </label>
              <input
                type="text"
                value={formData.employee_no}
                onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {formData.type === 'employee_id' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Station
                </label>
                <input
                  type="text"
                  value={formData.workstation}
                  onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                  placeholder="e.g., Head Office"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {formData.type === 'document' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_no}
                onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until (Optional)
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metadata (JSON)
            </label>
            <textarea
              value={formData.meta}
              onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
              placeholder='{"key": "value"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const RevokeModal = ({
  verification,
  onClose,
  onRevoke
}: {
  verification: Verification
  onClose: () => void
  onRevoke: (reason: string) => void
}) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      alert('Please provide a reason for revocation')
      return
    }
    setSubmitting(true)
    await onRevoke(reason)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Revoke Verification</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              You are about to revoke verification <span className="font-mono font-semibold">{verification.code}</span> for <span className="font-semibold">{verification.issued_to_name}</span>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Revocation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this verification is being revoked..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

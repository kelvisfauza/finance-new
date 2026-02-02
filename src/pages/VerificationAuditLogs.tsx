import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowLeft, Plus, Edit2, Ban, Calendar, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  action: 'create' | 'update' | 'revoke'
  code: string
  admin_user: string
  admin_email: string
  timestamp: string
  details: any
}

export const VerificationAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<'all' | 'create' | 'update' | 'revoke'>('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('verification_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'all') return true
    return log.action === filterAction
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-5 h-5 text-green-600" />
      case 'update':
        return <Edit2 className="w-5 h-5 text-blue-600" />
      case 'revoke':
        return <Ban className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Created</span>
      case 'update':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Updated</span>
      case 'revoke':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Revoked</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/verifications"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verification Audit Logs</h1>
            <p className="text-gray-600">Complete history of all verification actions</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Action:</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="revoke">Revoked</option>
            </select>
          </div>
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getActionBadge(log.action)}
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {log.code}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>
                            <span className="font-medium text-gray-900">{log.admin_email}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(log.timestamp), 'PPpp')}</span>
                        </div>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Details:</p>
                          <div className="space-y-1 text-sm text-gray-600">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

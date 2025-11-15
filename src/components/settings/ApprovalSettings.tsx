import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckCircle, Save } from 'lucide-react'

interface Setting {
  key: string
  value: any
}

export const ApprovalSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_settings')
        .select('key, value')
        .eq('category', 'approvals')

      if (error) throw error

      const settingsMap: Record<string, any> = {}
      data?.forEach((setting: Setting) => {
        settingsMap[setting.key] = setting.value.value
      })
      setSettings(settingsMap)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('finance_settings')
          .update({
            value: { value },
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
      }

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
            Approvals & Workflow Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">Configure how approval workflows function</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Approval Flow Mode
          </label>
          <select
            value={settings.approval_flow_mode || 'normal'}
            onChange={(e) => setSettings({ ...settings, approval_flow_mode: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="normal">Normal: Pending Finance → Pending Admin → Approved</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Standard workflow for all requests</p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.require_finance_before_admin || false}
              onChange={(e) => setSettings({ ...settings, require_finance_before_admin: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Require Finance review before Admin can approve</span>
              <p className="text-xs text-gray-500">If ON, Admin cannot approve until Finance has reviewed</p>
            </div>
          </label>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Final Approvers by Request Type</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Requests Final Approver
              </label>
              <select
                value={settings.expense_final_approver || 'Admin'}
                onChange={(e) => setSettings({ ...settings, expense_final_approver: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Admin">Admin</option>
                <option value="GM">General Manager</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requisitions Final Approver
              </label>
              <select
                value={settings.requisition_final_approver || 'Admin'}
                onChange={(e) => setSettings({ ...settings, requisition_final_approver: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Admin">Admin</option>
                <option value="GM">General Manager</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Requests Final Approver
              </label>
              <select
                value={settings.salary_final_approver || 'GM'}
                onChange={(e) => setSettings({ ...settings, salary_final_approver: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="GM">General Manager</option>
                <option value="HR Admin">HR Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

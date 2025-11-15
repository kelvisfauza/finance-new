import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Bell, Save } from 'lucide-react'

interface Setting {
  key: string
  value: any
}

export const NotificationSettings = () => {
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
        .eq('category', 'notifications')

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
            <Bell className="w-5 h-5 mr-2 text-yellow-600" />
            Notifications & SMS Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">Configure notification preferences and SMS templates</p>
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
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Notification Recipients</h4>
          <p className="text-xs text-gray-500 mb-4">Choose who receives notifications for different events</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notify on New Expense Request
              </label>
              <div className="flex flex-wrap gap-2">
                {['Finance', 'Admin', 'Manager'].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(settings.notify_new_expense || []).includes(role)}
                      onChange={(e) => {
                        const current = settings.notify_new_expense || []
                        setSettings({
                          ...settings,
                          notify_new_expense: e.target.checked
                            ? [...current, role]
                            : current.filter((r: string) => r !== role)
                        })
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notify after Finance Approval
              </label>
              <div className="flex flex-wrap gap-2">
                {['Admin', 'Manager', 'Requester'].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(settings.notify_finance_approval || []).includes(role)}
                      onChange={(e) => {
                        const current = settings.notify_finance_approval || []
                        setSettings({
                          ...settings,
                          notify_finance_approval: e.target.checked
                            ? [...current, role]
                            : current.filter((r: string) => r !== role)
                        })
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notify after Final Approval
              </label>
              <div className="flex flex-wrap gap-2">
                {['Requester', 'Finance', 'Admin'].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(settings.notify_final_approval || []).includes(role)}
                      onChange={(e) => {
                        const current = settings.notify_final_approval || []
                        setSettings({
                          ...settings,
                          notify_final_approval: e.target.checked
                            ? [...current, role]
                            : current.filter((r: string) => r !== role)
                        })
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">SMS Templates</h4>
          <p className="text-xs text-gray-500 mb-4">
            Use placeholders: {'{'}name{'}'}, {'{'}type{'}'}, {'{'}amount{'}'}, {'{'}ref{'}'}, {'{'}reason{'}'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval SMS Template
              </label>
              <textarea
                value={settings.sms_approval_template || ''}
                onChange={(e) => setSettings({ ...settings, sms_approval_template: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Dear {name}, your {type} of UGX {amount} has been approved..."
              />
              <p className="text-xs text-gray-500 mt-1">Sent when request is approved</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection SMS Template
              </label>
              <textarea
                value={settings.sms_rejection_template || ''}
                onChange={(e) => setSettings({ ...settings, sms_rejection_template: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Dear {name}, your {type} request of UGX {amount} was rejected..."
              />
              <p className="text-xs text-gray-500 mt-1">Sent when request is rejected</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.sms_on_cash_imbalance || false}
              onChange={(e) => setSettings({ ...settings, sms_on_cash_imbalance: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Send SMS for cash imbalance alerts</span>
              <p className="text-xs text-gray-500">Alert finance team when cash imbalance exceeds threshold</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

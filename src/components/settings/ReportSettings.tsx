import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { FileText, Save } from 'lucide-react'

interface Setting {
  key: string
  value: any
}

export const ReportSettings = () => {
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
        .eq('category', 'reports')

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
            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
            Reports & Periods Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">Configure report generation and period management</p>
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
            Default Reporting Period
          </label>
          <select
            value={settings.default_report_period || 'current_month'}
            onChange={(e) => setSettings({ ...settings, default_report_period: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="current_month">Current Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Default period when generating reports</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Finance Month Closing Date
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={settings.finance_month_closing_date || 28}
              onChange={(e) => setSettings({ ...settings, finance_month_closing_date: Number(e.target.value) })}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="1"
              max="31"
            />
            <span className="text-sm text-gray-600">day of month</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Day of the month when finance closes the books</p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.allow_edits_after_close || false}
              onChange={(e) => setSettings({ ...settings, allow_edits_after_close: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Allow edits after month close</span>
              <p className="text-xs text-gray-500">If disabled, transactions from closed months cannot be edited (recommended for data integrity)</p>
            </div>
          </label>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Automatic Report Delivery</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Finance Report Email
            </label>
            <input
              type="email"
              value={settings.finance_report_email || ''}
              onChange={(e) => setSettings({ ...settings, finance_report_email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="finance@greatpearlcoffee.com"
            />
            <p className="text-xs text-gray-500 mt-1">Email address for automatic monthly report delivery</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Period Locking</h4>
          <p className="text-xs text-blue-700">
            When a month is closed on the {settings.finance_month_closing_date || 28}th, all transactions from that month
            {settings.allow_edits_after_close ? ' can still be edited.' : ' will be locked and cannot be modified without admin override.'}
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { DollarSign, Save } from 'lucide-react'

interface Setting {
  key: string
  value: any
}

export const CashSettings = () => {
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
        .eq('category', 'cash')

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
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Cash & Balancing Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">Control how cash is handled and how strict the system is</p>
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
            Default Opening Cash Source
          </label>
          <select
            value={settings.cash_opening_source || 'last_closing'}
            onChange={(e) => setSettings({ ...settings, cash_opening_source: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="last_closing">Use last closing balance</option>
            <option value="manual">Manual input every morning</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">How to determine opening cash at start of day</p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.allow_negative_balance || false}
              onChange={(e) => setSettings({ ...settings, allow_negative_balance: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Allow negative cash balance</span>
              <p className="text-xs text-gray-500">If disabled, payments will be blocked when cash is insufficient</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cash Imbalance Warning Threshold (UGX)
          </label>
          <input
            type="number"
            value={settings.cash_warning_threshold || 10000}
            onChange={(e) => setSettings({ ...settings, cash_warning_threshold: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="10000"
          />
          <p className="text-xs text-gray-500 mt-1">Warn if cash difference exceeds this amount</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <input
              type="text"
              value="UGX"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number Format
            </label>
            <select
              value="1,000"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            >
              <option value="1,000">1,000 (comma)</option>
              <option value="1 000">1 000 (space)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

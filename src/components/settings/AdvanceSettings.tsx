import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { TrendingUp, Save } from 'lucide-react'

interface Setting {
  key: string
  value: any
}

export const AdvanceSettings = () => {
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
        .eq('category', 'advances')

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
            <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
            Supplier Advances Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">Control how advances are given and recovered</p>
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
            Max Advance Percentage
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={settings.max_advance_percentage || 30}
              onChange={(e) => setSettings({ ...settings, max_advance_percentage: Number(e.target.value) })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Maximum advance as percentage of average monthly deliveries</p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.auto_recover_advances || false}
              onChange={(e) => setSettings({ ...settings, auto_recover_advances: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Auto-recover advances from coffee payments</span>
              <p className="text-xs text-gray-500">Automatically deduct advance recovery from supplier payments</p>
            </div>
          </label>
        </div>

        {settings.auto_recover_advances && (
          <div className="ml-7">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Recovery Percentage per Payment
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.advance_recovery_percentage || 30}
                onChange={(e) => setSettings({ ...settings, advance_recovery_percentage: Number(e.target.value) })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0"
                max="100"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Percentage of each payment amount to deduct for advance recovery</p>
          </div>
        )}

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.allow_advance_with_arrears || false}
              onChange={(e) => setSettings({ ...settings, allow_advance_with_arrears: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Allow advances when supplier is already in arrears</span>
              <p className="text-xs text-gray-500">If disabled, suppliers with outstanding balances cannot receive new advances</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Advance Amount (UGX)
          </label>
          <input
            type="number"
            value={settings.minimum_advance_amount || 50000}
            onChange={(e) => setSettings({ ...settings, minimum_advance_amount: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            min="0"
            step="10000"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum amount for an advance to be processed</p>
        </div>
      </div>
    </div>
  )
}

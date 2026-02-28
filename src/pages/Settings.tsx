import { useState } from 'react'
import { DollarSign, CheckCircle, TrendingUp, Tag, Bell, FileText, Lock, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { CashSettings } from '../components/settings/CashSettings'
import { ApprovalSettings } from '../components/settings/ApprovalSettings'
import { AdvanceSettings } from '../components/settings/AdvanceSettings'
import { ExpenseSettings } from '../components/settings/ExpenseSettings'
import { NotificationSettings } from '../components/settings/NotificationSettings'
import { ReportSettings } from '../components/settings/ReportSettings'
import { SecurityQuestionsSetup } from '../components/finance/SecurityQuestionsSetup'

type SettingsTab = 'cash' | 'approvals' | 'advances' | 'expenses' | 'notifications' | 'reports' | 'security'

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('cash')
  const { employee } = useAuth()

  if (!employee) {
    return null
  }

  const hasAccess = employee.department === 'Finance' || employee.department === 'Admin'

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <Lock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            Finance Settings are only accessible to Finance and Admin department users.
          </p>
          <p className="text-sm text-gray-500">
            Your department: <span className="font-semibold">{employee.department}</span>
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'cash' as SettingsTab, name: 'General & Cash', icon: DollarSign, color: 'text-green-600' },
    { id: 'approvals' as SettingsTab, name: 'Approvals & Workflow', icon: CheckCircle, color: 'text-blue-600' },
    { id: 'security' as SettingsTab, name: 'Security & Verification', icon: Shield, color: 'text-red-600' },
    { id: 'advances' as SettingsTab, name: 'Advances', icon: TrendingUp, color: 'text-orange-600' },
    { id: 'expenses' as SettingsTab, name: 'Expenses & Categories', icon: Tag, color: 'text-purple-600' },
    { id: 'notifications' as SettingsTab, name: 'Notifications & SMS', icon: Bell, color: 'text-yellow-600' },
    { id: 'reports' as SettingsTab, name: 'Reports & Periods', icon: FileText, color: 'text-gray-600' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Settings</h1>
        <p className="text-gray-600">Take control of your finance operations - no IT support needed</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-green-700' : tab.color}`} />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'cash' && <CashSettings />}
          {activeTab === 'approvals' && <ApprovalSettings />}
          {activeTab === 'security' && <SecurityQuestionsSetup />}
          {activeTab === 'advances' && <AdvanceSettings />}
          {activeTab === 'expenses' && <ExpenseSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'reports' && <ReportSettings />}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-1">Finance in Control</p>
        <p className="text-xs text-blue-700">
          These settings give you full control over cash management, approvals, advances, and reporting.
          Changes take effect immediately and don't require IT support or system restart.
        </p>
      </div>
    </div>
  )
}

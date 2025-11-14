import { useState } from 'react'
import { FileText } from 'lucide-react'
import { FinanceMonthlyReport } from '../components/FinanceMonthlyReport'
import { PurchaseReport } from '../components/PurchaseReport'

export const ReportsNew = () => {
  const [activeTab, setActiveTab] = useState<'finance' | 'purchases'>('finance')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Financial and purchase reports</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-6 py-3 font-medium transition-colors flex items-center ${
              activeTab === 'finance'
                ? 'text-green-700 border-b-2 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Finance Report
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 font-medium transition-colors flex items-center ${
              activeTab === 'purchases'
                ? 'text-green-700 border-b-2 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Purchase Report
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'finance' && <FinanceMonthlyReport />}
          {activeTab === 'purchases' && <PurchaseReport />}
        </div>
      </div>
    </div>
  )
}

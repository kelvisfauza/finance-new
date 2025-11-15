import { useState } from 'react'
import { FileText } from 'lucide-react'
import { FinanceMonthlyReport } from '../components/FinanceMonthlyReport'
import { PurchaseReport } from '../components/PurchaseReport'

export const ReportsNew = () => {
  const [activeTab, setActiveTab] = useState<'finance' | 'purchases'>('finance')

  return (
    <div className="space-y-6">
      <div className="hidden print:block mb-6">
        <div className="border-b-4 border-green-700 pb-4">
          <div className="flex items-center gap-4">
            <img
              src="/gpcf-logo.png"
              alt="Great Pearl Coffee Logo"
              className="w-24 h-24 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Great Pearl Coffee</h1>
              <p className="text-lg text-gray-600">Finance Department</p>
              <p className="text-sm text-gray-600">Kasese, Uganda</p>
              <p className="text-xs text-gray-500 mt-1">
                www.greatpearlcoffee.com | info@greatpearlcoffee.com
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Financial and purchase reports</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 print:border-0 print:shadow-none">
        <div className="flex border-b border-gray-200 print:hidden">
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

        <div className="p-6 print:p-0">
          {activeTab === 'finance' && <FinanceMonthlyReport />}
          {activeTab === 'purchases' && <PurchaseReport />}
        </div>
      </div>
    </div>
  )
}

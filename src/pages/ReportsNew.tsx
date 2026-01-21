import { useState, useEffect } from 'react'
import { FileText, Users, TrendingUp, Scale } from 'lucide-react'
import { FinanceMonthlyReport } from '../components/FinanceMonthlyReport'
import { PurchaseReport } from '../components/PurchaseReport'
import { HRSalaryTab } from '../components/reports/HRSalaryTab'
import { IncomeStatementTab } from '../components/reports/IncomeStatementTab'
import { BalanceSheetTab } from '../components/reports/BalanceSheetTab'
import { ReportFilters, ReportFiltersComponent } from '../components/reports/ReportFilters'
import { supabase } from '../lib/supabaseClient'

export const ReportsNew = () => {
  const [activeTab, setActiveTab] = useState<'finance' | 'purchases' | 'hr' | 'income-statement' | 'balance-sheet'>('finance')
  const [hrFilters, setHrFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    department: '',
    status: 'All'
  })
  const [departments, setDepartments] = useState<string[]>([])

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('department')
        .not('department', 'is', null)

      if (error) throw error

      const uniqueDepts = Array.from(new Set(data?.map((d: any) => d.department).filter(Boolean))) as string[]
      setDepartments(uniqueDepts)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

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
        <div className="flex flex-wrap border-b border-gray-200 print:hidden">
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
          <button
            onClick={() => setActiveTab('hr')}
            className={`px-6 py-3 font-medium transition-colors flex items-center ${
              activeTab === 'hr'
                ? 'text-green-700 border-b-2 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            HR Payments
          </button>
          <button
            onClick={() => setActiveTab('income-statement')}
            className={`px-6 py-3 font-medium transition-colors flex items-center ${
              activeTab === 'income-statement'
                ? 'text-green-700 border-b-2 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Income Statement
          </button>
          <button
            onClick={() => setActiveTab('balance-sheet')}
            className={`px-6 py-3 font-medium transition-colors flex items-center ${
              activeTab === 'balance-sheet'
                ? 'text-green-700 border-b-2 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scale className="w-4 h-4 mr-2" />
            Balance Sheet
          </button>
        </div>

        <div className="p-6 print:p-0">
          {activeTab === 'finance' && <FinanceMonthlyReport />}
          {activeTab === 'purchases' && <PurchaseReport />}
          {activeTab === 'hr' && (
            <>
              <ReportFiltersComponent
                filters={hrFilters}
                onChange={setHrFilters}
                departments={departments}
              />
              <HRSalaryTab filters={hrFilters} />
            </>
          )}
          {activeTab === 'income-statement' && <IncomeStatementTab />}
          {activeTab === 'balance-sheet' && <BalanceSheetTab />}
        </div>
      </div>
    </div>
  )
}

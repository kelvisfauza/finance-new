import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { ReportFilters, ReportFiltersComponent } from '../components/reports/ReportFilters'
import { OverviewTab } from '../components/reports/OverviewTab'
import { ExpensesTab } from '../components/reports/ExpensesTab'
import { HRSalaryTab } from '../components/reports/HRSalaryTab'
import { RequisitionsTab } from '../components/reports/RequisitionsTab'
import { DailyStatementTab } from '../components/reports/DailyStatementTab'
import { IncomeStatementTab } from '../components/reports/IncomeStatementTab'
import { BalanceSheetTab } from '../components/reports/BalanceSheetTab'
import { useFinanceReports } from '../hooks/useFinanceReports'
import { supabase } from '../lib/supabaseClient'

type TabType = 'overview' | 'expenses' | 'hr-salary' | 'requisitions' | 'daily-statement' | 'income-statement' | 'balance-sheet'

export const FinanceReports = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [departments, setDepartments] = useState<string[]>([])
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    department: '',
    status: 'All'
  })

  const { stats, monthlyData, loading } = useFinanceReports(filters)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('department')

      if (error) throw error

      const uniqueDepts = Array.from(
        new Set(data?.map((item: any) => item.department).filter(Boolean))
      ) as string[]

      setDepartments(uniqueDepts.sort())
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'daily-statement', label: 'Daily Statement' },
    { id: 'income-statement', label: 'Income Statement' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'hr-salary', label: 'HR / Salary' },
    { id: 'requisitions', label: 'Requisitions' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-100 rounded-lg">
          <BarChart3 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-gray-600">Comprehensive financial reporting and analytics</p>
        </div>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onChange={setFilters}
        departments={departments}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} monthlyData={monthlyData} loading={loading} />
          )}
          {activeTab === 'daily-statement' && (
            <DailyStatementTab selectedDate={filters.dateFrom || new Date().toISOString().split('T')[0]} />
          )}
          {activeTab === 'income-statement' && <IncomeStatementTab />}
          {activeTab === 'balance-sheet' && <BalanceSheetTab />}
          {activeTab === 'expenses' && <ExpensesTab filters={filters} />}
          {activeTab === 'hr-salary' && <HRSalaryTab filters={filters} />}
          {activeTab === 'requisitions' && <RequisitionsTab filters={filters} />}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, exportToCSV } from '../lib/utils'
import { Users, Download, Search, CheckCircle, Clock } from 'lucide-react'
import { PermissionGate } from '../components/PermissionGate'

interface SalaryPayment {
  id: string
  month: string
  total_pay: number
  bonuses: number
  deductions: number
  employee_count: number
  status: string
  processed_by: string
  processed_date: string
  payment_method: string
  notes: string
  employee_details: any
  created_at: string
}

export const HRPayments = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Pending')

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPayments(data || [])
    } catch (error: any) {
      console.error('Error fetching salary payments:', error)
      alert('Failed to fetch salary payments')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    if (statusFilter) {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.month?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.processed_by?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPayments(filtered)
  }

  const handleExport = () => {
    const exportData = filteredPayments.map(payment => ({
      Month: payment.month,
      'Total Pay': payment.total_pay,
      Bonuses: payment.bonuses,
      Deductions: payment.deductions,
      'Net Pay': payment.total_pay + payment.bonuses - payment.deductions,
      'Employee Count': payment.employee_count,
      Status: payment.status,
      'Processed By': payment.processed_by || 'N/A',
      'Processed Date': payment.processed_date ? formatDate(payment.processed_date) : 'N/A'
    }))
    exportToCSV(exportData, `hr-payments-${statusFilter}-${new Date().toISOString().split('T')[0]}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salary payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Payments</h1>
          <p className="text-gray-600">Process salary and allowance payments</p>
        </div>
        <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Export
          </button>
        </PermissionGate>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by month or processor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processed">Processed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Pay</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Bonuses</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Deductions</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Net Pay</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Employees</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Processed</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    No salary payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const netPay = payment.total_pay + payment.bonuses - payment.deductions
                  return (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{payment.month}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(payment.total_pay)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(payment.bonuses)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(payment.deductions)}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">{formatCurrency(netPay)}</td>
                      <td className="py-3 px-4 text-center">{payment.employee_count}</td>
                      <td className="py-3 px-4">{payment.payment_method || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Processed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'Completed' || payment.status === 'Processed' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {payment.processed_date ? (
                          <div>
                            <div>{formatDate(payment.processed_date)}</div>
                            {payment.processed_by && (
                              <div className="text-gray-500 text-xs">{payment.processed_by}</div>
                            )}
                          </div>
                        ) : (
                          'Not yet processed'
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  filteredPayments
                    .filter(p => p.status === 'Pending')
                    .reduce((sum, p) => sum + p.total_pay + p.bonuses - p.deductions, 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p =>
                  p.month === new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                ).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredPayments.filter(p => p.status === 'Completed').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useEffect } from 'react'
import { supabase } from './lib/supabaseClient'

// Icons as React components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
  </svg>
)

const PaymentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const ExpensesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 19.504A8.966 8.966 0 0012 16a8.966 8.966 0 007.132 3.504" />
  </svg>
)

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Sample data
const dashboardMetrics = [
  {
    title: 'Total Revenue',
    value: 2450000000,
    change: 12.5,
    trend: 'up',
    icon: '💰',
    gradient: 'gradient-success'
  },
  {
    title: 'Total Payments',
    value: 1890000000,
    change: -3.2,
    trend: 'down',
    icon: '💸',
    gradient: 'gradient-warning'
  },
  {
    title: 'Net Cash Flow',
    value: 560000000,
    change: 8.7,
    trend: 'up',
    icon: '📈',
    gradient: 'gradient-primary'
  },
  {
    title: 'Pending Approvals',
    value: 15,
    change: 0,
    trend: 'neutral',
    icon: '⏳',
    gradient: 'gradient-danger'
  }
]

const recentPayments = [
  {
    id: 'PAY-001',
    supplier: 'Kyagalanyi Coffee Ltd',
    amount: 45000000,
    status: 'Approved',
    date: '2024-01-15',
    method: 'Bank Transfer'
  },
  {
    id: 'PAY-002',
    supplier: 'Volcafe Uganda',
    amount: 32000000,
    status: 'Pending',
    date: '2024-01-14',
    method: 'Mobile Money'
  },
  {
    id: 'PAY-003',
    supplier: 'Great Lakes Coffee',
    amount: 28000000,
    status: 'Approved',
    date: '2024-01-13',
    method: 'Bank Transfer'
  },
  {
    id: 'PAY-004',
    supplier: 'Ankole Coffee Producers',
    amount: 19000000,
    status: 'Rejected',
    date: '2024-01-12',
    method: 'Cash'
  }
]

const recentExpenses = [
  {
    id: 'EXP-001',
    category: 'Operations',
    description: 'Fuel and Transportation',
    amount: 2500000,
    status: 'Approved',
    date: '2024-01-15'
  },
  {
    id: 'EXP-002',
    category: 'Maintenance',
    description: 'Equipment Servicing',
    amount: 1800000,
    status: 'Pending',
    date: '2024-01-14'
  },
  {
    id: 'EXP-003',
    category: 'Utilities',
    description: 'Electricity Bill',
    amount: 950000,
    status: 'Approved',
    date: '2024-01-13'
  }
]

// Components
const Sidebar = ({ activeSection, setActiveSection }: { activeSection: string, setActiveSection: (section: string) => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'payments', label: 'Payments', icon: PaymentsIcon },
    { id: 'expenses', label: 'Expenses', icon: ExpensesIcon },
    { id: 'reports', label: 'Reports', icon: ReportsIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">GP</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Great Pearl</h1>
            <p className="text-sm text-gray-500">Finance System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`sidebar-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-emerald-50 text-emerald-700 active'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finance Dashboard</h2>
          <p className="text-gray-600">Manage your coffee business finances</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <SearchIcon />
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <BellIcon />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">JD</span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">John Doe</p>
              <p className="text-xs text-gray-500">Finance Manager</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

const MetricCard = ({ metric }: { metric: typeof dashboardMetrics[0] }) => {
  return (
    <div className="card-hover bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{metric.title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof metric.value === 'number' && metric.title !== 'Pending Approvals' 
              ? formatCurrency(metric.value) 
              : metric.value
            }
          </p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              metric.trend === 'up' ? 'text-emerald-600' : 
              metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'} 
              {metric.change !== 0 ? `${Math.abs(metric.change)}%` : 'No change'}
            </span>
          </div>
        </div>
        <div className={`w-16 h-16 ${metric.gradient} rounded-2xl flex items-center justify-center text-2xl`}>
          {metric.icon}
        </div>
      </div>
    </div>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 status-dot success'
      case 'pending':
        return 'bg-amber-100 text-amber-800 status-dot warning'
      case 'rejected':
        return 'bg-red-100 text-red-800 status-dot danger'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  )
}

const Dashboard = () => {
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, let's try a simple query to test connection
      const { data, error } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .limit(5)

      if (error) {
        console.error('Supabase error:', error)
        setError(`Database error: ${error.message}`)
        return
      }

      console.log('Raw data from finance_coffee_lots:', data)
      setPendingPayments(data || [])
    } catch (err) {
      console.error('Network error:', err)
      setError(`Network error: ${err.message || 'Failed to connect to database'}`)
    } finally {
      setLoading(false)
    }
  }

  // Add connection test component
  const ConnectionTest = () => {
    const [connectionStatus, setConnectionStatus] = useState('testing')
    
    useEffect(() => {
      testConnection()
    }, [])
    
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('finance_coffee_lots')
          .select('count')
          .limit(1)
        
        if (error) {
          console.error('Connection test failed:', error)
          setConnectionStatus('failed')
        } else {
          console.log('Connection test successful:', data)
          setConnectionStatus('success')
        }
      } catch (err) {
        console.error('Connection test error:', err)
        setConnectionStatus('failed')
      }
    }
    
    return (
      <div className="mb-4 p-4 rounded-lg border">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'testing' ? 'bg-yellow-500 animate-pulse' :
            connectionStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium">
            Database Connection: {
              connectionStatus === 'testing' ? 'Testing...' :
              connectionStatus === 'success' ? 'Connected' : 'Failed'
            }
          </span>
          {connectionStatus === 'failed' && (
            <button 
              onClick={testConnection}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ConnectionTest />
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          <div className="h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Revenue Chart Placeholder</p>
          </div>
        </div>
        
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Distribution</h3>
          <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Payment Chart Placeholder</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pending Coffee Payments</h3>
              <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading pending payments...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600 font-medium">Error loading payments</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <button 
                onClick={fetchPendingPayments}
                className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-gray-500">No pending coffee payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-enhanced w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity (KG)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.supplier_id || 'Unknown Supplier'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {payment.supplier_id?.slice(0, 8) || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {Number(payment.quantity_kg || 0).toLocaleString()} kg
                        </div>
                        <div className="text-sm text-gray-500">
                          @ {formatCurrency(payment.unit_price_ugx || 0)}/kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.total_amount_ugx || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={payment.finance_status || 'Pending'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
              <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-enhanced w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-500">{expense.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={expense.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simple query first to test connection
      const { data, error } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .limit(10)

      if (error) {
        console.error('Supabase error:', error)
        setError(`Database error: ${error.message}`)
        return
      }

      console.log('Payments data:', data)
      setPayments(data || [])
    } catch (err) {
      console.error('Network error:', err)
      setError(`Network error: ${err.message || 'Failed to connect to database'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-600">Manage supplier payments and transactions</p>
        </div>
        <button className="btn-animate bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2">
          <PlusIcon />
          <span>New Payment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-group">
            <label className="form-label">Date Range</label>
            <select className="form-input">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input">
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-input">
              <option>All Methods</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Cash</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount Range</label>
            <select className="form-input">
              <option>All Amounts</option>
              <option>Under 10M</option>
              <option>10M - 50M</option>
              <option>Over 50M</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading payments...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-red-600 font-medium">Error loading payments</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button 
              onClick={fetchPayments}
              className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">📋</div>
            <p className="text-gray-500">No coffee payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-enhanced w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lot ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">
                        {payment.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.supplier_id || 'Unknown Supplier'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {payment.supplier_id?.slice(0, 8) || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {Number(payment.quantity_kg || 0).toLocaleString()} kg
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.unit_price_ugx || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.total_amount_ugx || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatDate(payment.assessed_at || payment.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge 
                        status={payment.finance_status || 'Pending'} 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-emerald-600 hover:text-emerald-900">View</button>
                        {(payment.finance_status === 'READY_FOR_FINANCE' || !payment.finance_status) && (
                          <button className="text-blue-600 hover:text-blue-900">Approve</button>
                        )}
                        <button className="text-red-600 hover:text-red-900">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const Expenses = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
          <p className="text-gray-600">Track and manage company expenses</p>
        </div>
        <button className="btn-animate bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2">
          <PlusIcon />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(15000000)}</div>
            <div className="text-sm text-blue-600">Operations</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-700">{formatCurrency(8500000)}</div>
            <div className="text-sm text-purple-600">Maintenance</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(5200000)}</div>
            <div className="text-sm text-orange-600">Utilities</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table-enhanced w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{expense.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{formatDate(expense.date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={expense.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-emerald-600 hover:text-emerald-900">Approve</button>
                      <button className="text-red-600 hover:text-red-900">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-600">Generate and view financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Summary</h3>
            <p className="text-gray-600 text-sm mb-4">Monthly financial overview and key metrics</p>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium">
              Generate Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Report</h3>
            <p className="text-gray-600 text-sm mb-4">Detailed payment transactions and analysis</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium">
              Generate Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Expense Report</h3>
            <p className="text-gray-600 text-sm mb-4">Comprehensive expense tracking and categorization</p>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {[
            { name: 'Monthly Financial Summary - January 2024', date: '2024-01-31', size: '2.4 MB', type: 'PDF' },
            { name: 'Payment Analysis Report - Q4 2023', date: '2024-01-15', size: '1.8 MB', type: 'Excel' },
            { name: 'Expense Breakdown - December 2023', date: '2024-01-10', size: '1.2 MB', type: 'PDF' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 font-medium text-sm">{report.type}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{report.name}</div>
                  <div className="text-sm text-gray-500">{report.date} • {report.size}</div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                  Download
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Configure your finance system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" className="form-input" defaultValue="Great Pearl Coffee Factory" />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input">
                <option>UGX - Ugandan Shilling</option>
                <option>USD - US Dollar</option>
                <option>EUR - Euro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Financial Year Start</label>
              <select className="form-input">
                <option>January</option>
                <option>April</option>
                <option>July</option>
                <option>October</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Payment Approvals</div>
                <div className="text-sm text-gray-500">Get notified when payments need approval</div>
              </div>
              <button className="w-12 h-6 bg-emerald-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Expense Alerts</div>
                <div className="text-sm text-gray-500">Alert when expenses exceed budget</div>
              </div>
              <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Monthly Reports</div>
                <div className="text-sm text-gray-500">Automatically generate monthly reports</div>
              </div>
              <button className="w-12 h-6 bg-emerald-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="Enter current password" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Enter new password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" placeholder="Confirm new password" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-medium text-amber-800 mb-2">Password Requirements</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include at least one number</li>
                <li>• Include at least one special character</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium">
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}

// Main App Component
export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard')

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />
      case 'payments':
        return <Payments />
      case 'expenses':
        return <Expenses />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
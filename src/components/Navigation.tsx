import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Coffee,
  HandCoins,
  Wallet,
  Receipt,
  FileText as FileTextIcon,
  Users,
  FileText,
  Settings
} from 'lucide-react'
import { PermissionGate } from './PermissionGate'
import { usePendingCounts } from '../hooks/usePendingCounts'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, countKey: null },
  { path: '/coffee-payments', label: 'Coffee Payments', icon: Coffee, countKey: null },
  { path: '/supplier-advances', label: 'Supplier Advances', icon: HandCoins, countKey: null },
  { path: '/cash-management', label: 'Cash Management', icon: Wallet, countKey: null },
  { path: '/expenses', label: 'Expenses', icon: Receipt, countKey: 'expenses' },
  { path: '/requisitions', label: 'Requisitions', icon: FileTextIcon, countKey: 'requisitions' },
  { path: '/hr-payments', label: 'HR Payments', icon: Users, countKey: 'hrPayments' },
  { path: '/reports', label: 'Reports', icon: FileText, countKey: null },
]

export const Navigation = () => {
  const { counts } = usePendingCounts()

  const getCount = (countKey: string | null) => {
    if (!countKey) return 0
    return counts[countKey as keyof typeof counts] || 0
  }

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const count = getCount(item.countKey)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <div className="flex items-center">
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </div>
            {count > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {count}
              </span>
            )}
          </NavLink>
        )
      })}

      <PermissionGate roles={['Super Admin', 'Manager', 'Administrator']}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-emerald-100 text-emerald-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </NavLink>
      </PermissionGate>
    </nav>
  )
}

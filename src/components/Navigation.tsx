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

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/coffee-payments', label: 'Coffee Payments', icon: Coffee },
  { path: '/supplier-advances', label: 'Supplier Advances', icon: HandCoins },
  { path: '/cash-management', label: 'Cash Management', icon: Wallet },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/requisitions', label: 'Requisitions', icon: FileTextIcon },
  { path: '/hr-payments', label: 'HR Payments', icon: Users },
  { path: '/reports', label: 'Reports', icon: FileText },
]

export const Navigation = () => {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="w-5 h-5 mr-3" />
            {item.label}
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

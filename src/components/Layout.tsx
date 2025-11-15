import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

export const Layout = () => {
  const { employee, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <img
                src="/gpcf-logo.png"
                alt="Great Pearl Coffee"
                className="w-12 h-12 object-contain mr-3"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Great Pearl</h1>
                <p className="text-xs text-gray-600">Finance Portal</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <Navigation />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 truncate">{employee?.name}</p>
                  <p className="text-xs text-gray-600 truncate">{employee?.role}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{employee?.name}</p>
                    <p className="text-xs text-gray-600">{employee?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee?.department} • {employee?.position}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 ml-64">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

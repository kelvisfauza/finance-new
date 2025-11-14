import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireFinance?: boolean
  requireRoles?: string[]
  requirePermissions?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireFinance = true,
  requireRoles,
  requirePermissions
}) => {
  const { user, employee, loading, isFinanceAccess } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !employee) {
    return <Navigate to="/auth" replace />
  }

  if (requireFinance && !isFinanceAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Finance Department System.
          </p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  if (requireRoles && requireRoles.length > 0) {
    const hasRole = requireRoles.includes(employee.role)
    if (!hasRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="text-orange-500 text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Insufficient Permissions</h2>
            <p className="text-gray-600">
              This action requires {requireRoles.join(' or ')} role.
            </p>
          </div>
        </div>
      )
    }
  }

  if (requirePermissions && requirePermissions.length > 0) {
    const hasAllPermissions = requirePermissions.every((perm) =>
      employee.permissions.includes(perm) || employee.role === 'Super Admin'
    )
    if (!hasAllPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="text-orange-500 text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Insufficient Permissions</h2>
            <p className="text-gray-600">
              You don't have the required permissions to access this resource.
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

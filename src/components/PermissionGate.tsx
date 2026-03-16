import { useAuth } from '../contexts/AuthContext'

interface PermissionGateProps {
  children: React.ReactNode
  permissions?: string[]
  roles?: string[]
  requireAll?: boolean
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permissions,
  roles,
  requireAll = false
}) => {
  const { employee } = useAuth()

  if (!employee) return null

  if (employee.role === 'Super Admin') {
    return <>{children}</>
  }

  const hasRole = roles && roles.length > 0 ? roles.includes(employee.role) : false
  const hasPermission = permissions && permissions.length > 0
    ? (requireAll
        ? permissions.every((perm) => employee.permissions.includes(perm))
        : permissions.some((perm) => employee.permissions.includes(perm)))
    : false

  // If both roles and permissions are specified, user needs either one (OR logic)
  if (roles && roles.length > 0 && permissions && permissions.length > 0) {
    if (!hasRole && !hasPermission) return null
  } else if (roles && roles.length > 0) {
    // Only roles specified
    if (!hasRole) return null
  } else if (permissions && permissions.length > 0) {
    // Only permissions specified
    if (!hasPermission) return null
  }

  return <>{children}</>
}

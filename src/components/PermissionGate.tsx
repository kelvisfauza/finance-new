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

  if (roles && roles.length > 0) {
    const hasRole = roles.includes(employee.role)
    if (!hasRole) return null
  }

  if (permissions && permissions.length > 0) {
    const checkPermission = requireAll
      ? permissions.every((perm) => employee.permissions.includes(perm))
      : permissions.some((perm) => employee.permissions.includes(perm))

    if (!checkPermission) return null
  }

  return <>{children}</>
}

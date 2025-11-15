import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface Employee {
  id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  salary: number
  role: string
  permissions: string[]
  status: string
  auth_user_id?: string
  disabled?: boolean
}

interface AuthContextType {
  user: User | null
  employee: Employee | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (roles: string | string[]) => boolean
  isFinanceAccess: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session?.user) {
        setUser(null)
        setEmployee(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchEmployee(session.user.id)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const fetchEmployee = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('status', 'Active')
        .maybeSingle()

      if (error) throw error

      if (data && !data.disabled) {
        setEmployee(data)
      } else {
        setEmployee(null)
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
      setEmployee(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .eq('status', 'Active')
          .maybeSingle()

        if (employeeError) {
          await supabase.auth.signOut()
          throw new Error('Failed to fetch employee data: ' + employeeError.message)
        }

        if (!employeeData || employeeData.disabled) {
          await supabase.auth.signOut()
          throw new Error('No active employee record found')
        }

        const hasAccess =
          employeeData.department === 'Finance' ||
          employeeData.permissions.includes('Finance') ||
          ['Super Admin', 'Manager', 'Administrator', 'Finance'].includes(employeeData.role)

        if (!hasAccess) {
          await supabase.auth.signOut()
          throw new Error('Access denied. Finance department access required.')
        }

        setEmployee(employeeData)
        setUser(data.user)
      }
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmployee(null)
  }

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false
    if (employee.role === 'Super Admin') return true
    return employee.permissions.includes(permission)
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!employee) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(employee.role)
  }

  const isFinanceAccess =
    employee?.department === 'Finance' ||
    employee?.permissions.includes('Finance') ||
    ['Super Admin', 'Manager', 'Administrator', 'Finance'].includes(employee?.role || '')

  const value = {
    user,
    employee,
    loading,
    signIn,
    signOut,
    hasPermission,
    hasRole,
    isFinanceAccess
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

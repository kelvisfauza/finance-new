import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface EmployeeInfo {
  id: string
  name: string
  email: string
  position: string
  department: string
  phone?: string
}

export const useEmployeesByEmail = (emails: (string | null | undefined)[]) => {
  const [employees, setEmployees] = useState<Map<string, EmployeeInfo>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmployees = async () => {
      const uniqueEmails = [...new Set(emails.filter(Boolean))] as string[]

      if (uniqueEmails.length === 0) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, email, position, department, phone')
          .in('email', uniqueEmails)

        if (error) throw error

        const employeeMap = new Map<string, EmployeeInfo>()
        data?.forEach((emp: any) => {
          employeeMap.set(emp.email, emp)
        })

        setEmployees(employeeMap)
      } catch (error) {
        console.error('Error fetching employees:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [emails.join(',')])

  const getEmployee = (email: string | null | undefined): EmployeeInfo | null => {
    if (!email) return null
    return employees.get(email) || null
  }

  return { employees, getEmployee, loading }
}

export const useEmployeeByEmail = (email: string | null | undefined) => {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!email) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, email, position, department, phone')
          .eq('email', email)
          .maybeSingle()

        if (error) throw error

        setEmployee(data)
      } catch (error) {
        console.error('Error fetching employee:', error)
        setEmployee(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployee()
  }, [email])

  return { employee, loading }
}

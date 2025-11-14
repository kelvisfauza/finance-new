import { supabase } from '../lib/supabaseClient'
import { useNotifications } from './useNotifications'
import { useSMSNotifications } from './useSMSNotifications'

export interface ApprovalRequest {
  id?: string
  request_type: 'hr_payment' | 'salary' | 'field_financing' | 'expense'
  amount: number
  requested_by_id: string
  requested_by_name: string
  recipient_id?: string
  recipient_name?: string
  recipient_phone?: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  created_at?: string
  updated_at?: string
}

export const useApprovalSystem = () => {
  const { createApprovalNotification } = useNotifications()
  const {
    sendApprovalRequestSMS,
    sendApprovalResponseSMS,
    sendSalaryApprovalSMS
  } = useSMSNotifications()

  const createApprovalRequest = async (request: Omit<ApprovalRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .insert([{ ...request, status: 'pending' }])
        .select()
        .single()

      if (approvalError) {
        console.error('Error creating approval request:', approvalError)
        return { success: false, error: approvalError }
      }

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, phone, role')
        .in('role', ['Administrator', 'Super Admin'])
        .eq('is_active', true)
        .not('phone', 'is', null)

      if (employeesError) {
        console.error('Error fetching approvers:', employeesError)
      } else if (employees && employees.length > 0) {
        for (const approver of employees) {
          await createApprovalNotification(
            approver.id,
            request.requested_by_name,
            request.amount,
            request.request_type
          )

          if (approver.phone) {
            await sendApprovalRequestSMS(
              approver.name,
              approver.phone,
              request.amount,
              request.requested_by_name,
              request.request_type
            )
          }
        }
      }

      return { success: true, data: approvalData }
    } catch (error) {
      console.error('Exception creating approval request:', error)
      return { success: false, error }
    }
  }

  const respondToApproval = async (
    approvalId: string,
    status: 'approved' | 'rejected',
    approverName: string,
    recipientId?: string,
    recipientName?: string,
    recipientPhone?: string,
    amount?: number,
    requestType?: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', approvalId)

      if (updateError) {
        console.error('Error updating approval:', updateError)
        return { success: false, error: updateError }
      }

      if (recipientId && recipientName && recipientPhone && amount && requestType) {
        await sendApprovalResponseSMS(
          recipientName,
          recipientPhone,
          amount,
          status,
          approverName,
          requestType
        )
      }

      return { success: true }
    } catch (error) {
      console.error('Exception responding to approval:', error)
      return { success: false, error }
    }
  }

  return {
    createApprovalRequest,
    respondToApproval
  }
}

import { supabase } from '../lib/supabaseClient'

export interface Notification {
  id?: string
  user_id: string
  title: string
  message: string
  type: 'approval_request' | 'approval_response' | 'salary' | 'payment' | 'info'
  read: boolean
  created_at?: string
}

export const useNotifications = () => {
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single()

      if (error) {
        console.error('Error creating notification:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Exception creating notification:', error)
      return { success: false, error }
    }
  }

  const createApprovalNotification = async (
    userId: string,
    approverName: string,
    amount: number,
    requestType: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)

    return createNotification({
      user_id: userId,
      title: 'Approval Request',
      message: `${approverName} has requested approval for ${requestType} of ${formattedAmount}`,
      type: 'approval_request',
      read: false
    })
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      console.error('Exception marking notification as read:', error)
      return { success: false, error }
    }
  }

  return {
    createNotification,
    createApprovalNotification,
    markAsRead
  }
}

import { supabase } from '../lib/supabaseClient'

export interface SMSNotification {
  phone: string
  message: string
  type: 'approval_request' | 'approval_response' | 'salary_approval' | 'salary_initialized' | 'field_financing_approval'
}

export const useSMSNotifications = () => {
  const sendSMS = async (phone: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone, message }
      })

      if (error) {
        console.error('Error sending SMS:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Exception sending SMS:', error)
      return { success: false, error }
    }
  }

  const sendApprovalRequestSMS = async (
    approverName: string,
    approverPhone: string,
    amount: number,
    senderName: string,
    type: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)

    const message = `Dear ${approverName}, ${senderName} has requested approval for ${type} of ${formattedAmount}. Please review and approve/reject in the Finance Portal.`

    return sendSMS(approverPhone, message)
  }

  const sendApprovalResponseSMS = async (
    recipientName: string,
    recipientPhone: string,
    amount: number,
    status: 'approved' | 'rejected',
    approverName: string,
    type: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)

    const message = `Dear ${recipientName}, your ${type} request for ${formattedAmount} has been ${status} by ${approverName}.`

    return sendSMS(recipientPhone, message)
  }

  const sendSalaryApprovalSMS = async (
    approverName: string,
    approverPhone: string,
    totalAmount: number,
    employeeCount: number,
    initiatorName: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(totalAmount)

    const message = `Dear ${approverName}, ${initiatorName} has submitted salary payments for ${employeeCount} employees totaling ${formattedAmount}. Please review in the Finance Portal.`

    return sendSMS(approverPhone, message)
  }

  const sendSalaryInitializedSMS = async (
    employeeName: string,
    employeePhone: string,
    amount: number,
    period: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)

    const message = `Dear ${employeeName}, your salary of ${formattedAmount} for ${period} has been initialized and is pending approval.`

    return sendSMS(employeePhone, message)
  }

  const sendFieldFinancingApprovalSMS = async (
    approverName: string,
    approverPhone: string,
    amount: number,
    farmerName: string,
    requestedBy: string
  ) => {
    const formattedAmount = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount)

    const message = `Dear ${approverName}, ${requestedBy} has requested field financing of ${formattedAmount} for farmer ${farmerName}. Please review in the Finance Portal.`

    return sendSMS(approverPhone, message)
  }

  return {
    sendSMS,
    sendApprovalRequestSMS,
    sendApprovalResponseSMS,
    sendSalaryApprovalSMS,
    sendSalaryInitializedSMS,
    sendFieldFinancingApprovalSMS
  }
}

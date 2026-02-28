import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface VerificationCodeResponse {
  code_id: string
  code: string
  phone: string
  expires_at: string
}

export const useSMSVerification = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendVerificationCode = async (
    withdrawalRequestId: string,
    approverEmail: string,
    approverPhone: string
  ): Promise<VerificationCodeResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'create_withdrawal_verification_code',
        {
          p_withdrawal_request_id: withdrawalRequestId,
          p_approver_email: approverEmail,
          p_approver_phone: approverPhone,
        }
      )

      if (rpcError) throw rpcError

      const codeData = data as VerificationCodeResponse

      const { data: empData } = await supabase
        .from('employees')
        .select('name')
        .eq('email', approverEmail)
        .maybeSingle()

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-withdrawal-verification-sms`
      const smsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: approverPhone,
          code: codeData.code,
          approverName: empData?.name
        }),
      })

      if (!smsResponse.ok) {
        const errorData = await smsResponse.json()
        console.error('Failed to send SMS:', errorData)
        throw new Error('Failed to send SMS verification code')
      }

      return codeData
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code')
      return null
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (
    codeId: string,
    code: string
  ): Promise<{ success: boolean; error?: string; attempts_remaining?: number }> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_withdrawal_code', {
        p_code_id: codeId,
        p_code: code,
      })

      if (rpcError) throw rpcError

      return data
    } catch (err: any) {
      setError(err.message || 'Failed to verify code')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    sendVerificationCode,
    verifyCode,
    loading,
    error,
  }
}

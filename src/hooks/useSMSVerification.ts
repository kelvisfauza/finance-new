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

      return data as VerificationCodeResponse
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

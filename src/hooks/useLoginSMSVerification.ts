import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface LoginVerificationCode {
  id: string
  user_id: string
  phone_number: string
  verification_code: string
  expires_at: string
  verified: boolean
  attempts: number
  created_at: string
}

export const useLoginSMSVerification = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendLoginVerificationCode = async (userId: string, phoneNumber: string) => {
    setLoading(true)
    setError(null)

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      const { data: codeData, error: insertError } = await supabase
        .from('login_verification_codes')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          verification_code: code,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const { error: smsError } = await supabase.functions.invoke(
        'send-withdrawal-verification-sms',
        {
          body: {
            phoneNumber,
            code,
            type: 'login'
          },
        }
      )

      if (smsError) throw smsError

      return { success: true, codeId: codeData.id }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send verification code'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const verifyLoginCode = async (userId: string, code: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: codes, error: fetchError } = await supabase
        .from('login_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      if (!codes || codes.length === 0) {
        throw new Error('No valid verification code found or code has expired')
      }

      const latestCode = codes[0] as LoginVerificationCode

      if (latestCode.attempts >= 3) {
        throw new Error('Maximum verification attempts exceeded. Please request a new code.')
      }

      if (latestCode.verification_code !== code) {
        await supabase
          .from('login_verification_codes')
          .update({ attempts: latestCode.attempts + 1 })
          .eq('id', latestCode.id)

        throw new Error('Invalid verification code')
      }

      const { error: updateError } = await supabase
        .from('login_verification_codes')
        .update({ verified: true })
        .eq('id', latestCode.id)

      if (updateError) throw updateError

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify code'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    sendLoginVerificationCode,
    verifyLoginCode,
    loading,
    error,
  }
}

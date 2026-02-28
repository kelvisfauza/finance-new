import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface SecurityQuestion {
  id: string
  user_id: string
  user_email: string
  question_1: string
  question_2: string
  question_3: string
  is_active: boolean
  created_at: string
}

interface SecurityAnswers {
  answer_1: string
  answer_2: string
  answer_3: string
}

const hashAnswer = async (answer: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(answer.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useSecurityQuestions = () => {
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSecurityQuestions = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const { data, error: fetchError } = await supabase
        .from('user_security_questions')
        .select('*')
        .eq('user_email', user.user.email)
        .maybeSingle()

      if (fetchError) throw fetchError

      setSecurityQuestions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityQuestions()
  }, [])

  const setupSecurityQuestions = async (
    question1: string,
    answer1: string,
    question2: string,
    answer2: string,
    question3: string,
    answer3: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const answer1Hash = await hashAnswer(answer1)
      const answer2Hash = await hashAnswer(answer2)
      const answer3Hash = await hashAnswer(answer3)

      const { error: upsertError } = await supabase
        .from('user_security_questions')
        .upsert({
          user_id: user.user.id,
          user_email: user.user.email!,
          question_1: question1,
          answer_1_hash: answer1Hash,
          question_2: question2,
          answer_2_hash: answer2Hash,
          question_3: question3,
          answer_3_hash: answer3Hash,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_email'
        })

      if (upsertError) throw upsertError

      await fetchSecurityQuestions()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to setup security questions')
      return false
    } finally {
      setLoading(false)
    }
  }

  const verifySecurityAnswers = async (
    userEmail: string,
    answers: SecurityAnswers
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('user_security_questions')
        .select('answer_1_hash, answer_2_hash, answer_3_hash')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!data) throw new Error('No security questions found')

      const answer1Hash = await hashAnswer(answers.answer_1)
      const answer2Hash = await hashAnswer(answers.answer_2)
      const answer3Hash = await hashAnswer(answers.answer_3)

      const allMatch =
        data.answer_1_hash === answer1Hash &&
        data.answer_2_hash === answer2Hash &&
        data.answer_3_hash === answer3Hash

      return allMatch
    } catch (err: any) {
      setError(err.message || 'Failed to verify security answers')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    securityQuestions,
    setupSecurityQuestions,
    verifySecurityAnswers,
    loading,
    error,
    refetch: fetchSecurityQuestions,
  }
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoginSMSVerification } from '../hooks/useLoginSMSVerification'
import { supabase } from '../lib/supabaseClient'
import { LogIn, Shield } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'credentials' | 'verification'>('credentials')
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const { signIn } = useAuth()
  const { sendLoginVerificationCode, verifyLoginCode, loading: smsLoading } = useLoginSMSVerification()
  const navigate = useNavigate()

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) throw new Error('Authentication failed')

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('phone')
        .eq('email', email)
        .maybeSingle()

      if (employeeError) throw employeeError

      if (!employeeData?.phone) {
        await signIn(authData.user, authData.session)
        navigate('/dashboard')
        return
      }

      setPendingUserId(authData.user.id)
      setPhoneNumber(employeeData.phone)

      const result = await sendLoginVerificationCode(authData.user.id, employeeData.phone)

      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification code')
      }

      await supabase.auth.signOut()

      setStep('verification')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!pendingUserId) throw new Error('Session expired. Please try again.')

      const result = await verifyLoginCode(pendingUserId, verificationCode)

      if (!result.success) {
        throw new Error(result.error || 'Verification failed')
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Authentication failed')

      await signIn(authData.user, authData.session)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!pendingUserId || !phoneNumber) return

    setError('')
    const result = await sendLoginVerificationCode(pendingUserId, phoneNumber)

    if (!result.success) {
      setError(result.error || 'Failed to resend code')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-gray-50 to-blue-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/gpcf-logo.png"
                alt="Great Pearl Coffee"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Great Pearl Finance
            </h1>
            <p className="text-gray-600">
              {step === 'credentials' ? 'Finance Department Portal' : 'SMS Verification'}
            </p>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="your.email@greatpearl.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || smsLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || smsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {smsLoading ? 'Sending code...' : 'Verifying...'}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Continue
                </>
              )}
            </button>
          </form>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Verification code sent</p>
                    <p className="text-xs mt-1">
                      Please enter the 6-digit code sent to {phoneNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify & Sign In
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={smsLoading}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                >
                  {smsLoading ? 'Sending...' : 'Resend Code'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials')
                    setVerificationCode('')
                    setError('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>Finance Department Access Only</p>
            <p className="mt-1 text-xs text-gray-500">
              Contact IT support if you need access
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>&copy; 2024 Great Pearl Coffee. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

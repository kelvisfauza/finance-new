import { useState, useEffect } from 'react'
import { Lock, Smartphone, HelpCircle, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useSMSVerification } from '../../hooks/useSMSVerification'
import { useSecurityQuestions } from '../../hooks/useSecurityQuestions'

interface WithdrawalVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
  withdrawalRequestId: string
  approverEmail: string
  approverPhone: string
  amount: number
}

type VerificationMethod = 'sms' | 'security_questions' | null

export const WithdrawalVerificationModal = ({
  isOpen,
  onClose,
  onVerified,
  withdrawalRequestId,
  approverEmail,
  approverPhone,
  amount,
}: WithdrawalVerificationModalProps) => {
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeId, setCodeId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  const [answer1, setAnswer1] = useState('')
  const [answer2, setAnswer2] = useState('')
  const [answer3, setAnswer3] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)

  const { sendVerificationCode, verifyCode, loading: smsLoading } = useSMSVerification()
  const { securityQuestions, verifySecurityAnswers, loading: sqLoading } = useSecurityQuestions()

  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expires - now) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        setErrorMessage('Verification code expired. Please request a new one.')
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const handleSendSMS = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const result = await sendVerificationCode(withdrawalRequestId, approverEmail, approverPhone)

    if (result) {
      setCodeId(result.code_id)
      setExpiresAt(result.expires_at)
      setSuccessMessage(`Verification code sent to ${result.phone}`)

      console.log('DEV MODE - Verification Code:', result.code)
    } else {
      setErrorMessage('Failed to send verification code')
    }
  }

  const handleVerifySMS = async () => {
    if (!codeId || !verificationCode) {
      setErrorMessage('Please enter the verification code')
      return
    }

    setErrorMessage('')
    const result = await verifyCode(codeId, verificationCode)

    if (result.success) {
      setSuccessMessage('Verification successful!')
      setTimeout(() => {
        onVerified()
        onClose()
      }, 1000)
    } else {
      setErrorMessage(result.error || 'Invalid verification code')
      if (result.attempts_remaining !== undefined) {
        setAttemptsRemaining(result.attempts_remaining)
      }
    }
  }

  const handleVerifySecurityQuestions = async () => {
    if (!answer1 || !answer2 || !answer3) {
      setErrorMessage('Please answer all security questions')
      return
    }

    setErrorMessage('')
    const verified = await verifySecurityAnswers(approverEmail, {
      answer_1: answer1,
      answer_2: answer2,
      answer_3: answer3,
    })

    if (verified) {
      setSuccessMessage('Security questions verified successfully!')
      setTimeout(() => {
        onVerified()
        onClose()
      }, 1000)
    } else {
      setErrorMessage('Incorrect answers. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              Verify Your Identity
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Security Check Required</strong>
              <br />
              Please verify your identity before approving this withdrawal request.
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}

          {!verificationMethod && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Choose verification method:</p>

              <button
                onClick={() => {
                  setVerificationMethod('sms')
                  handleSendSMS()
                }}
                disabled={smsLoading}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-start gap-3 disabled:opacity-50"
              >
                <Smartphone className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">SMS Verification</h4>
                  <p className="text-sm text-gray-600">
                    Receive a 6-digit code via SMS to {approverPhone}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setVerificationMethod('security_questions')}
                disabled={!securityQuestions}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Security Questions</h4>
                  <p className="text-sm text-gray-600">
                    {securityQuestions
                      ? 'Answer your security questions to verify'
                      : 'Security questions not set up'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {verificationMethod === 'sms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Code sent to {approverPhone}</span>
                {timeRemaining > 0 && (
                  <span className="text-orange-600 font-medium">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Attempts remaining: {attemptsRemaining}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVerifySMS}
                  disabled={verificationCode.length !== 6 || smsLoading || timeRemaining === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  {smsLoading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>
                <button
                  onClick={handleSendSMS}
                  disabled={smsLoading || timeRemaining > 0}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend
                </button>
              </div>

              <button
                onClick={() => {
                  setVerificationMethod(null)
                  setVerificationCode('')
                  setCodeId(null)
                  setExpiresAt(null)
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                Choose different method
              </button>
            </div>
          )}

          {verificationMethod === 'security_questions' && securityQuestions && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {securityQuestions.question_1}
                </label>
                <input
                  type="text"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Your answer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {securityQuestions.question_2}
                </label>
                <input
                  type="text"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Your answer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {securityQuestions.question_3}
                </label>
                <input
                  type="text"
                  value={answer3}
                  onChange={(e) => setAnswer3(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Your answer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVerifySecurityQuestions}
                  disabled={!answer1 || !answer2 || !answer3 || sqLoading}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  {sqLoading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Answers'
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  setVerificationMethod(null)
                  setAnswer1('')
                  setAnswer2('')
                  setAnswer3('')
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                Choose different method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

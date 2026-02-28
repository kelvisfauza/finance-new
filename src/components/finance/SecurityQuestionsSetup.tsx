import { useState } from 'react'
import { useSecurityQuestions } from '../../hooks/useSecurityQuestions'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'

const COMMON_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite book?",
  "What was your childhood nickname?",
  "What is the name of your favorite teacher?",
  "What street did you grow up on?",
  "What is your favorite food?",
  "What is the name of your first school?",
  "What is your father's middle name?",
]

export const SecurityQuestionsSetup = () => {
  const { securityQuestions, setupSecurityQuestions, loading } = useSecurityQuestions()
  const [showForm, setShowForm] = useState(!securityQuestions)

  const [question1, setQuestion1] = useState('')
  const [answer1, setAnswer1] = useState('')
  const [question2, setQuestion2] = useState('')
  const [answer2, setAnswer2] = useState('')
  const [question3, setQuestion3] = useState('')
  const [answer3, setAnswer3] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    if (!question1 || !answer1 || !question2 || !answer2 || !question3 || !answer3) {
      setErrorMessage('Please fill in all questions and answers')
      return
    }

    if (answer1.length < 3 || answer2.length < 3 || answer3.length < 3) {
      setErrorMessage('Answers must be at least 3 characters long')
      return
    }

    const success = await setupSecurityQuestions(
      question1,
      answer1,
      question2,
      answer2,
      question3,
      answer3
    )

    if (success) {
      setSuccessMessage('Security questions setup successfully!')
      setShowForm(false)
      setAnswer1('')
      setAnswer2('')
      setAnswer3('')
    } else {
      setErrorMessage('Failed to setup security questions')
    }
  }

  if (securityQuestions && !showForm) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-green-600" />
            Security Questions
          </h3>
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800">
            Your security questions are set up and active. These will be used to verify your identity when approving withdrawal requests.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Update Security Questions
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
          <Lock className="w-5 h-5 mr-2 text-blue-600" />
          Setup Security Questions
        </h3>
        <p className="text-sm text-gray-600">
          Set up security questions for additional verification when approving withdrawal requests over 100,000 UGX.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question 1
          </label>
          <select
            value={question1}
            onChange={(e) => setQuestion1(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            required
          >
            <option value="">Select a question</option>
            {COMMON_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
            placeholder="Your answer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question 2
          </label>
          <select
            value={question2}
            onChange={(e) => setQuestion2(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            required
          >
            <option value="">Select a question</option>
            {COMMON_QUESTIONS.map((q) => (
              <option key={q} value={q} disabled={q === question1}>
                {q}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
            placeholder="Your answer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question 3
          </label>
          <select
            value={question3}
            onChange={(e) => setQuestion3(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
            required
          >
            <option value="">Select a question</option>
            {COMMON_QUESTIONS.map((q) => (
              <option key={q} value={q} disabled={q === question1 || q === question2}>
                {q}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={answer3}
            onChange={(e) => setAnswer3(e.target.value)}
            placeholder="Your answer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
            minLength={3}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Remember your answers. They will be used to verify your identity when approving withdrawals.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Setting up...' : 'Setup Security Questions'}
          </button>
          {securityQuestions && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency } from '../../lib/utils'
import { Wallet, Send, X } from 'lucide-react'

interface WithdrawalRequestFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const WithdrawalRequestForm = ({ onSuccess, onCancel }: WithdrawalRequestFormProps) => {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK'>('CASH')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    fetchWalletBalance()
  }, [])

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setUserEmail(user.email || '')

      const { data: walletData } = await supabase
        .from('user_accounts')
        .select('current_balance')
        .eq('user_id', user.id)
        .maybeSingle()

      setWalletBalance(walletData?.current_balance || 0)
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (amountNum > walletBalance) {
      alert(`Insufficient wallet balance. You have ${formatCurrency(walletBalance)} available.`)
      return
    }

    if (!reason.trim()) {
      alert('Please provide a reason for withdrawal')
      return
    }

    if (paymentChannel === 'MOBILE_MONEY' && !phoneNumber.trim()) {
      alert('Please provide a mobile money phone number')
      return
    }

    if (paymentChannel === 'BANK') {
      if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
        alert('Please provide complete bank details')
        return
      }
    }

    setLoading(true)
    try {
      const requestData: any = {
        user_id: userId,
        amount: amountNum,
        reason: reason.trim(),
        request_type: 'withdrawal',
        status: 'pending',
        requested_by: userEmail,
        payment_channel: paymentChannel
      }

      if (paymentChannel === 'MOBILE_MONEY') {
        requestData.phone_number = phoneNumber.trim()
      }

      if (paymentChannel === 'BANK') {
        requestData.disbursement_bank_name = bankName.trim()
        requestData.disbursement_account_number = accountNumber.trim()
        requestData.disbursement_account_name = accountName.trim()
      }

      const { error } = await supabase
        .from('money_requests')
        .insert([requestData])

      if (error) throw error

      alert(`Withdrawal request submitted successfully!\n\nAmount: ${formatCurrency(amountNum)}\n\nYour request will be reviewed by admin${amountNum > 100000 ? 's (3 approvals required)' : ''} and then finance.`)

      setAmount('')
      setReason('')
      setPhoneNumber('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      setPaymentChannel('CASH')

      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Error submitting withdrawal request:', error)
      alert(`Failed to submit request: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const amountNum = parseFloat(amount) || 0
  const requiresThreeApprovals = amountNum > 100000

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Wallet className="w-5 h-5 mr-2 text-blue-600" />
          Request Withdrawal
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Available Balance:</strong> {formatCurrency(walletBalance)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (UGX)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter amount"
            required
            min="1"
            max={walletBalance}
          />
          {amountNum > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {requiresThreeApprovals ? (
                <span className="text-orange-600 font-medium">
                  ⚠ High value: Requires 3 admin approvals + finance approval
                </span>
              ) : (
                <span className="text-green-600">
                  ✓ Requires 1 admin approval + finance approval
                </span>
              )}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Withdrawal
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Explain why you need to withdraw funds"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Disbursement Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentChannel('CASH')}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                paymentChannel === 'CASH'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentChannel('MOBILE_MONEY')}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                paymentChannel === 'MOBILE_MONEY'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setPaymentChannel('BANK')}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                paymentChannel === 'BANK'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              Bank
            </button>
          </div>
        </div>

        {paymentChannel === 'MOBILE_MONEY' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Money Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 0700123456"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Payment will be sent automatically to this number upon approval
            </p>
          </div>
        )}

        {paymentChannel === 'BANK' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Stanbic Bank"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Account holder name"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Finance will process bank transfer manually using these details
            </p>
          </div>
        )}

        {paymentChannel === 'CASH' && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              A payment voucher will be printed upon approval. Collect cash from finance office with the voucher.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading || amountNum > walletBalance || amountNum <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

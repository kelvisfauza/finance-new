import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface FinanceSettings {
  cash_opening_source: 'last_closing' | 'manual'
  allow_negative_balance: boolean
  cash_warning_threshold: number
  currency: string
  approval_flow_mode: string
  require_finance_before_admin: boolean
  expense_final_approver: string
  requisition_final_approver: string
  salary_final_approver: string
  max_advance_percentage: number
  auto_recover_advances: boolean
  advance_recovery_percentage: number
  allow_advance_with_arrears: boolean
  minimum_advance_amount: number
  payment_rounding: 'exact' | 'nearest_100' | 'down_100'
  payment_methods: string[]
  default_payment_method: string
  require_payment_reference: boolean
  notify_new_expense: string[]
  notify_finance_approval: string[]
  notify_final_approval: string[]
  sms_on_cash_imbalance: boolean
  sms_approval_template: string
  sms_rejection_template: string
  default_report_period: string
  finance_month_closing_date: number
  allow_edits_after_close: boolean
  finance_report_email: string
}

const DEFAULT_SETTINGS: FinanceSettings = {
  cash_opening_source: 'last_closing',
  allow_negative_balance: false,
  cash_warning_threshold: 10000,
  currency: 'UGX',
  approval_flow_mode: 'normal',
  require_finance_before_admin: true,
  expense_final_approver: 'Admin',
  requisition_final_approver: 'Admin',
  salary_final_approver: 'GM',
  max_advance_percentage: 30,
  auto_recover_advances: true,
  advance_recovery_percentage: 30,
  allow_advance_with_arrears: false,
  minimum_advance_amount: 50000,
  payment_rounding: 'nearest_100',
  payment_methods: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'],
  default_payment_method: 'Mobile Money',
  require_payment_reference: true,
  notify_new_expense: ['Finance', 'Admin'],
  notify_finance_approval: ['Admin'],
  notify_final_approval: ['Requester', 'Finance'],
  sms_on_cash_imbalance: false,
  sms_approval_template: 'Dear {name}, your {type} of UGX {amount} has been approved. Ref: {ref}. Great Pearl Coffee.',
  sms_rejection_template: 'Dear {name}, your {type} request of UGX {amount} was rejected. Reason: {reason}. Great Pearl Coffee.',
  default_report_period: 'current_month',
  finance_month_closing_date: 28,
  allow_edits_after_close: false,
  finance_report_email: 'finance@greatpearlcoffee.com'
}

export const useFinanceSettings = () => {
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()

    const channel = supabase
      .channel('finance_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'finance_settings'
        },
        () => {
          fetchSettings()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('finance_settings')
        .select('key, value')

      if (fetchError) throw fetchError

      const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS }
      data?.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value.value
      })

      setSettings(settingsMap as FinanceSettings)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching finance settings:', err)
      setError(err.message)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const getSetting = <K extends keyof FinanceSettings>(key: K): FinanceSettings[K] => {
    return settings[key]
  }

  const checkCashAvailable = (requiredAmount: number, currentCash: number): boolean => {
    if (settings.allow_negative_balance) {
      return true
    }
    return currentCash >= requiredAmount
  }

  const shouldWarnCashImbalance = (difference: number): boolean => {
    return Math.abs(difference) > settings.cash_warning_threshold
  }

  const roundPaymentAmount = (amount: number): number => {
    switch (settings.payment_rounding) {
      case 'nearest_100':
        return Math.round(amount / 100) * 100
      case 'down_100':
        return Math.floor(amount / 100) * 100
      case 'exact':
      default:
        return amount
    }
  }

  const canGiveAdvance = (supplierHasArrears: boolean, advanceAmount: number): {
    allowed: boolean
    reason?: string
  } => {
    if (advanceAmount < settings.minimum_advance_amount) {
      return {
        allowed: false,
        reason: `Advance amount must be at least UGX ${settings.minimum_advance_amount.toLocaleString()}`
      }
    }

    if (supplierHasArrears && !settings.allow_advance_with_arrears) {
      return {
        allowed: false,
        reason: 'Supplier has outstanding arrears. Clear existing balance first.'
      }
    }

    return { allowed: true }
  }

  const calculateAdvanceRecovery = (paymentAmount: number): number => {
    if (!settings.auto_recover_advances) {
      return 0
    }
    return (paymentAmount * settings.advance_recovery_percentage) / 100
  }

  return {
    settings,
    loading,
    error,
    getSetting,
    checkCashAvailable,
    shouldWarnCashImbalance,
    roundPaymentAmount,
    canGiveAdvance,
    calculateAdvanceRecovery,
    refetch: fetchSettings
  }
}

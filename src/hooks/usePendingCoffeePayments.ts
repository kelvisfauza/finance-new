import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface PendingCoffeeLot {
  id: string
  coffee_record_id: string
  supplier_id: string
  assessed_by: string
  assessed_at: string
  quality_json: any
  unit_price_ugx: number
  quantity_kg: number
  total_amount_ugx: number
  finance_status: string
  finance_notes?: string
  created_at: string
  updated_at: string
}

export function usePendingCoffeePayments() {
  return useQuery({
    queryKey: ['pending-coffee-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .eq('finance_status', 'READY_FOR_FINANCE')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load pending coffee payments', error)
        throw error
      }

      return (data || []) as PendingCoffeeLot[]
    },
  })
}

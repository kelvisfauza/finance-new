import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface PendingCoffeeLot {
  id: string
  batch_number: string
  supplier_name: string
  supplier_id?: string
  kilograms: number
  final_price?: number
  suggested_price?: number
  assessed_by?: string
  status: string
  date: string
  created_at: string
}

export function usePendingCoffeePayments() {
  return useQuery({
    queryKey: ['pending-coffee-payments'],
    queryFn: async () => {
      const { data: coffeeLots, error } = await supabase
        .from('finance_coffee_lots')
        .select(`
          *,
          supplier:suppliers(name, code),
          quality_assessment:quality_assessments(batch_number)
        `)
        .eq('finance_status', 'READY_FOR_FINANCE')
        .order('assessed_at', { ascending: false })

      if (error) {
        console.error('Failed to load coffee lots', error)
        throw error
      }

      if (!coffeeLots || coffeeLots.length === 0) {
        return []
      }

      const transformed = coffeeLots.map((lot: any) => ({
        id: lot.id,
        batch_number: lot.quality_assessment?.batch_number || 'N/A',
        supplier_name: lot.supplier?.name || 'N/A',
        supplier_id: lot.supplier_id,
        kilograms: Number(lot.quantity_kg),
        final_price: Number(lot.unit_price_ugx),
        suggested_price: Number(lot.unit_price_ugx),
        assessed_by: lot.assessed_by,
        status: lot.finance_status,
        date: lot.assessed_at,
        created_at: lot.created_at,
      }))

      return transformed as PendingCoffeeLot[]
    },
  })
}

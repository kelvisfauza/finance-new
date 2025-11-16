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
      const { data, error } = await supabase
        .from('coffee_records')
        .select(`
          *,
          quality_assessments(final_price, suggested_price, assessed_by)
        `)
        .in('status', ['submitted_to_finance'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load pending coffee payments', error)
        throw error
      }

      const transformed = (data || []).map((record: any) => ({
        id: record.id,
        batch_number: record.batch_number,
        supplier_name: record.supplier_name,
        supplier_id: record.supplier_id,
        kilograms: Number(record.kilograms),
        final_price: record.quality_assessments?.[0]?.final_price || 0,
        suggested_price: record.quality_assessments?.[0]?.suggested_price || 0,
        assessed_by: record.quality_assessments?.[0]?.assessed_by,
        status: record.status,
        date: record.date,
        created_at: record.created_at,
      }))

      return transformed as PendingCoffeeLot[]
    },
  })
}

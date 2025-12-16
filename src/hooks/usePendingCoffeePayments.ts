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
      const { data: paymentRecords, error } = await supabase
        .from('payment_records')
        .select(`
          id,
          supplier,
          amount,
          status,
          batch_number,
          created_at,
          quality_assessment:quality_assessments!payment_records_quality_assessment_id_fkey(
            final_price,
            suggested_price,
            assessed_by
          )
        `)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load payment records', error)
        throw error
      }

      if (!paymentRecords || paymentRecords.length === 0) {
        return []
      }

      const batchNumbers = paymentRecords.map((pr: any) => pr.batch_number).filter(Boolean)

      const { data: coffeeRecords } = await supabase
        .from('coffee_records')
        .select('batch_number, kilograms, supplier_id')
        .in('batch_number', batchNumbers)

      const coffeeMap = new Map()
      coffeeRecords?.forEach((cr: any) => {
        coffeeMap.set(cr.batch_number, cr)
      })

      const transformed = paymentRecords.map((record: any) => {
        const coffeeRecord = coffeeMap.get(record.batch_number)
        return {
          id: record.id,
          batch_number: record.batch_number || 'N/A',
          supplier_name: record.supplier || 'N/A',
          supplier_id: coffeeRecord?.supplier_id,
          kilograms: Number(coffeeRecord?.kilograms || 0),
          final_price: Number(record.quality_assessment?.final_price || 0),
          suggested_price: Number(record.quality_assessment?.suggested_price || 0),
          assessed_by: record.quality_assessment?.assessed_by,
          status: record.status,
          date: record.created_at,
          created_at: record.created_at,
        }
      })

      return transformed as PendingCoffeeLot[]
    },
  })
}

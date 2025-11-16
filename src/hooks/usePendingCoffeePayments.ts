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
      const { data: coffeeRecords, error: coffeeError } = await supabase
        .from('coffee_records')
        .select('*')
        .in('status', ['submitted_to_finance'])
        .order('created_at', { ascending: false })

      if (coffeeError) {
        console.error('Failed to load coffee records', coffeeError)
        throw coffeeError
      }

      if (!coffeeRecords || coffeeRecords.length === 0) {
        return []
      }

      const batchNumbers = coffeeRecords.map((r: any) => r.batch_number)

      const { data: assessments, error: assessmentError } = await supabase
        .from('quality_assessments')
        .select('batch_number, final_price, suggested_price, assessed_by')
        .in('batch_number', batchNumbers)

      if (assessmentError) {
        console.error('Failed to load quality assessments', assessmentError)
      }

      const assessmentMap = new Map()
      if (assessments) {
        assessments.forEach((a: any) => {
          assessmentMap.set(a.batch_number, a)
        })
      }

      const transformed = coffeeRecords.map((record: any) => {
        const assessment = assessmentMap.get(record.batch_number)
        return {
          id: record.id,
          batch_number: record.batch_number,
          supplier_name: record.supplier_name,
          supplier_id: record.supplier_id,
          kilograms: Number(record.kilograms),
          final_price: assessment?.final_price || 0,
          suggested_price: assessment?.suggested_price || 0,
          assessed_by: assessment?.assessed_by,
          status: record.status,
          date: record.date,
          created_at: record.created_at,
        }
      })

      return transformed as PendingCoffeeLot[]
    },
  })
}

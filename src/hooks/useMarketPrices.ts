import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export interface MarketPrices {
  drugarLocal: number
  wugarLocal: number
  robustaFaqLocal: number
  iceArabica: number
  robusta: number
  exchangeRate: number
  lastUpdated?: string
  updatedAt?: string
}

export const useMarketPrices = () => {
  const [prices, setPrices] = useState<MarketPrices>({
    drugarLocal: 0,
    wugarLocal: 0,
    robustaFaqLocal: 0,
    iceArabica: 0,
    robusta: 0,
    exchangeRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('market_prices')
        .select('*')
        .eq('price_type', 'reference_prices')
        .maybeSingle()

      if (fetchError) throw fetchError

      if (data) {
        setPrices({
          drugarLocal: Number(data.arabica_buying_price) || 0,
          wugarLocal: Number(data.wugar_local) || 0,
          robustaFaqLocal: Number(data.robusta_buying_price) || 0,
          iceArabica: Number(data.ice_arabica) || 0,
          robusta: Number(data.robusta) || 0,
          exchangeRate: Number(data.exchange_rate) || 0,
          lastUpdated: data.last_updated || data.updated_at
        })
        setError(null)
      } else {
        setError('No price data available')
      }
    } catch (err) {
      console.error('Error fetching market prices:', err)
      setError('Failed to fetch prices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  useRealtimeSubscription(['market_prices'], fetchPrices)

  return { prices, loading, error }
}

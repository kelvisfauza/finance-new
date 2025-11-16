import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'

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

  useEffect(() => {
    const unsubscribe = db
      .collection('market_prices')
      .doc('reference_prices')
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() as any

            let lastUpdatedStr: string | undefined
            const timestamp = data.lastUpdated || data.updatedAt
            if (timestamp) {
              if (typeof timestamp === 'object' && 'toDate' in timestamp) {
                lastUpdatedStr = timestamp.toDate().toISOString()
              } else if (typeof timestamp === 'string') {
                lastUpdatedStr = timestamp
              }
            }

            setPrices({
              drugarLocal: data.drugarLocal || 0,
              wugarLocal: data.wugarLocal || 0,
              robustaFaqLocal: data.robustaFaqLocal || 0,
              iceArabica: data.iceArabica || 0,
              robusta: data.robusta || 0,
              exchangeRate: data.exchangeRate || 0,
              lastUpdated: lastUpdatedStr
            })
            setError(null)
          } else {
            setError('No price data available')
          }
          setLoading(false)
        },
        (err) => {
          console.error('Error fetching market prices:', err)
          setError('Failed to fetch prices')
          setLoading(false)
        }
      )

    return () => unsubscribe()
  }, [])

  return { prices, loading, error }
}

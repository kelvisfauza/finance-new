import { useMarketPrices } from '../hooks/useMarketPrices'
import { TrendingUp, Clock } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { format } from 'date-fns'

export const MarketPricesCard = () => {
  const { prices, loading, error } = useMarketPrices()

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-amber-600 mb-4">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Today's Buying Prices</h3>
        </div>
        <p className="text-sm text-gray-500">Price data unavailable</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold text-gray-900">Today's Buying Prices</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Read-only</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Drugar Local</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(prices.drugarLocal)}/kg</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Wugar Local</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(prices.wugarLocal)}/kg</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Robusta FAQ Local</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(prices.robustaFaqLocal)}/kg</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Exchange Rate</span>
          <span className="text-sm font-bold text-gray-900">{prices.exchangeRate.toLocaleString()} UGX/USD</span>
        </div>
      </div>

      {prices.lastUpdated && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Last updated: {(() => {
              try {
                return format(new Date(prices.lastUpdated), 'MMM d, yyyy h:mm a')
              } catch {
                return prices.lastUpdated
              }
            })()}
          </span>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 italic">
        Prices managed by Data Analyst
      </div>
    </div>
  )
}

import { Wallet } from 'lucide-react'

export const CashManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Management</h1>
        <p className="text-gray-600">Daily cash float, transactions, and balancing</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Cash Management</p>
          <p className="text-sm">Manage daily cash float and transactions</p>
        </div>
      </div>
    </div>
  )
}

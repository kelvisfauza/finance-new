import { Receipt } from 'lucide-react'

export const Expenses = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Expenses</h1>
        <p className="text-gray-600">Review and approve expense requests</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Expense Management</p>
          <p className="text-sm">Approve and track expense requests</p>
        </div>
      </div>
    </div>
  )
}

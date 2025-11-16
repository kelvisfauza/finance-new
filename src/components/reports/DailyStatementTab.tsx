import { useState, useEffect, useRef } from 'react'
import { Printer, Download } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate } from '../../lib/utils'
import { format } from 'date-fns'

interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  timestamp: string
  reference?: string
}

interface DailyStatementProps {
  selectedDate: string
}

export const DailyStatementTab = ({ selectedDate }: DailyStatementProps) => {
  const [cashIn, setCashIn] = useState<Transaction[]>([])
  const [cashOut, setCashOut] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDailyStatement()
  }, [selectedDate])

  const fetchDailyStatement = async () => {
    try {
      setLoading(true)
      const dateStart = `${selectedDate}T00:00:00`
      const dateEnd = `${selectedDate}T23:59:59`

      // Fetch cash deposits (Cash In)
      const { data: deposits, error: depositsError } = await supabase
        .from('finance_cash_transactions')
        .select('*')
        .gte('confirmed_at', dateStart)
        .lte('confirmed_at', dateEnd)
        .eq('status', 'confirmed')
        .gt('amount', 0)
        .order('confirmed_at', { ascending: true })

      if (depositsError) throw depositsError

      // Fetch expenses (Cash Out)
      const { data: expenses, error: expensesError } = await supabase
        .from('finance_expenses')
        .select('*')
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .order('date', { ascending: true })

      if (expensesError) throw expensesError

      // Fetch approval requests payments (Cash Out)
      const { data: approvalPayments, error: approvalError } = await supabase
        .from('approval_requests')
        .select('*')
        .not('finance_approved_at', 'is', null)
        .gte('finance_approved_at', dateStart)
        .lte('finance_approved_at', dateEnd)
        .order('finance_approved_at', { ascending: true })

      if (approvalError) throw approvalError

      // Fetch coffee payments (Cash Out)
      const { data: coffeePayments, error: coffeeError } = await supabase
        .from('supplier_payments')
        .select('*')
        .eq('status', 'POSTED')
        .gte('approved_at', dateStart)
        .lte('approved_at', dateEnd)
        .order('approved_at', { ascending: true })

      if (coffeeError) throw coffeeError

      // Format Cash In
      const cashInTransactions: Transaction[] = deposits?.map((d: any) => ({
        id: d.id,
        type: 'Deposit',
        description: d.notes || d.reference || 'Cash Deposit',
        amount: Number(d.amount),
        timestamp: d.confirmed_at,
        reference: d.reference
      })) || []

      // Format Cash Out
      const cashOutTransactions: Transaction[] = []

      expenses?.forEach((e: any) => {
        cashOutTransactions.push({
          id: e.id,
          type: 'Expense',
          description: `${e.category}${e.description ? ': ' + e.description : ''}`,
          amount: Number(e.amount),
          timestamp: e.date,
          reference: e.receipt_number
        })
      })

      approvalPayments?.forEach((a: any, index: number) => {
        const refNumber = `REF-${format(new Date(a.finance_approved_at), 'yyyyMMdd')}-${String(index + 1).padStart(3, '0')}`
        cashOutTransactions.push({
          id: a.id,
          type: a.type || 'Payment',
          description: a.description || `${a.type} Payment - ${a.department || 'General'}`,
          amount: Number(a.amount),
          timestamp: a.finance_approved_at,
          reference: refNumber
        })
      })

      coffeePayments?.forEach((c: any) => {
        cashOutTransactions.push({
          id: c.id,
          type: 'Coffee Payment',
          description: `Coffee Payment${c.reference ? ' - ' + c.reference : ''}`,
          amount: Number(c.amount_paid_ugx),
          timestamp: c.approved_at,
          reference: c.reference
        })
      })

      cashOutTransactions.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

      setCashIn(cashInTransactions)
      setCashOut(cashOutTransactions)

      // Calculate balances
      const totalIn = cashInTransactions.reduce((sum, t) => sum + t.amount, 0)
      const totalOut = cashOutTransactions.reduce((sum, t) => sum + t.amount, 0)

      // Fetch opening balance (closing balance from previous day)
      const { data: balanceData } = await supabase
        .from('finance_cash_balance')
        .select('current_balance')
        .single()

      const currentBalance = balanceData?.current_balance || 0
      const calculatedOpening = currentBalance - totalIn + totalOut
      setOpeningBalance(calculatedOpening)
      setClosingBalance(currentBalance)

    } catch (error) {
      console.error('Error fetching daily statement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const totalCashIn = cashIn.reduce((sum, t) => sum + t.amount, 0)
  const totalCashOut = cashOut.reduce((sum, t) => sum + t.amount, 0)
  const netCashFlow = totalCashIn - totalCashOut

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading daily statement...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex justify-between items-center no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Cash Statement</h3>
            <p className="text-sm text-gray-600">
              Statement for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Statement
          </button>
        </div>

        <div id="print-section" ref={printRef} className="bg-white">
          {/* Company Header */}
          <div className="border-b-2 border-gray-300 pb-6 mb-6">
            <div className="flex items-start gap-4">
              <img
                src="/gpcf-logo.png"
                alt="Great Pearl Coffee"
                className="w-20 h-20 object-contain"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Great Pearl Coffee</h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>www.greatpearlcoffee.com</p>
                  <p>info@greatpearlcoffee.com</p>
                  <p>+256 781 121 639</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Daily Cash Flow Statement</h2>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(openingBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(closingBalance)}</p>
            </div>
          </div>

          {/* Cash In Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-emerald-700 mb-3 border-b border-emerald-200 pb-2">
              Cash Inflows
            </h3>
            {cashIn.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold">Time</th>
                    <th className="text-left py-2 font-semibold">Type</th>
                    <th className="text-left py-2 font-semibold">Description</th>
                    <th className="text-left py-2 font-semibold">Reference</th>
                    <th className="text-right py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cashIn.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100">
                      <td className="py-2">{format(new Date(transaction.timestamp), 'HH:mm')}</td>
                      <td className="py-2">{transaction.type}</td>
                      <td className="py-2">{transaction.description}</td>
                      <td className="py-2 text-gray-600">{transaction.reference || '-'}</td>
                      <td className="py-2 text-right font-semibold text-emerald-600">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-emerald-50">
                    <td colSpan={4} className="py-3 text-right">Total Cash In:</td>
                    <td className="py-3 text-right text-emerald-700">
                      {formatCurrency(totalCashIn)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 italic py-4">No cash inflows for this date</p>
            )}
          </div>

          {/* Cash Out Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-red-700 mb-3 border-b border-red-200 pb-2">
              Cash Outflows
            </h3>
            {cashOut.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold">Time</th>
                    <th className="text-left py-2 font-semibold">Type</th>
                    <th className="text-left py-2 font-semibold">Description</th>
                    <th className="text-left py-2 font-semibold">Reference</th>
                    <th className="text-right py-2 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cashOut.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100">
                      <td className="py-2">{format(new Date(transaction.timestamp), 'HH:mm')}</td>
                      <td className="py-2">{transaction.type}</td>
                      <td className="py-2">{transaction.description}</td>
                      <td className="py-2 text-gray-600">{transaction.reference || '-'}</td>
                      <td className="py-2 text-right font-semibold text-red-600">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-red-50">
                    <td colSpan={4} className="py-3 text-right">Total Cash Out:</td>
                    <td className="py-3 text-right text-red-700">
                      {formatCurrency(totalCashOut)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 italic py-4">No cash outflows for this date</p>
            )}
          </div>

          {/* Summary Section */}
          <div className="border-t-2 border-gray-300 pt-4">
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cash In</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCashIn)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cash Out</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalCashOut)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Net Cash Flow</p>
                <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netCashFlow)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
            <p className="mt-1">Great Pearl Coffee Finance - Confidential</p>
          </div>
        </div>
      </div>
    </>
  )
}

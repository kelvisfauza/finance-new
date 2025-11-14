import { formatCurrency, formatDate } from '../lib/utils'
import { X, Printer } from 'lucide-react'

interface PayslipPrintProps {
  payment: {
    id: string
    request_type: string
    amount: number
    requested_by: string
    reason: string
    status: string
    approved_by: string | null
    approved_at: string | null
    finance_approved_by: string | null
    finance_approved_at: string | null
    admin_approved_by: string | null
    admin_approved_at: string | null
    created_at: string
  }
  employeeDetails?: {
    name: string
    phone?: string
    email?: string
  }
  onClose: () => void
}

export const PayslipPrint = ({ payment, employeeDetails, onClose }: PayslipPrintProps) => {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:block print:p-0">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:shadow-none print:my-0 print:max-w-none print:max-h-none print:overflow-visible">
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Payment Slip Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div id="payslip-content" className="p-6 print:p-8">
          <div className="border-b-4 border-green-700 pb-4 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo without bc.png"
                  alt="Great Pearl Coffee Logo"
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Great Pearl Coffee</h1>
                  <p className="text-sm text-gray-600">Kasese, Uganda</p>
                  <div className="text-xs text-gray-600 mt-1">
                    <p>www.greatpearlcoffee.com</p>
                    <p>info@greatpearlcoffee.com</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Payment Slip</p>
                <p className="text-base font-semibold text-gray-900">#{payment.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2 border-b pb-1">Employee Details</h2>
              <div className="space-y-1.5">
                <div>
                  <p className="text-sm text-gray-600">Employee Name</p>
                  <p className="font-semibold text-gray-900">{employeeDetails?.name || 'N/A'}</p>
                </div>
                {employeeDetails?.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-semibold text-gray-900">{employeeDetails.phone}</p>
                  </div>
                )}
                {employeeDetails?.email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{employeeDetails.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2 border-b pb-1">Payment Details</h2>
              <div className="space-y-1.5">
                <div>
                  <p className="text-sm text-gray-600">Payment Type</p>
                  <p className="font-semibold text-gray-900">{payment.request_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Request Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(payment.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-green-700">{payment.status.toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-2 border-b pb-1">Approval History</h2>
            <div className="space-y-2">
              {payment.finance_approved_by && (
                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Finance Department</p>
                    <p className="text-xs text-gray-600">Approved by: {payment.finance_approved_by}</p>
                    {payment.finance_approved_at && (
                      <p className="text-xs text-gray-500">Date: {formatDate(payment.finance_approved_at)}</p>
                    )}
                  </div>
                </div>
              )}
              {payment.admin_approved_by && (
                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Administration</p>
                    <p className="text-xs text-gray-600">Approved by: {payment.admin_approved_by}</p>
                    {payment.admin_approved_at && (
                      <p className="text-xs text-gray-500">Date: {formatDate(payment.admin_approved_at)}</p>
                    )}
                  </div>
                </div>
              )}
              {payment.approved_by && (
                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Final Approval</p>
                    <p className="text-xs text-gray-600">Approved by: {payment.approved_by}</p>
                    {payment.approved_at && (
                      <p className="text-xs text-gray-500">Date: {formatDate(payment.approved_at)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {payment.reason && (
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900 mb-2 border-b pb-1">Payment Reason</h2>
              <p className="text-sm text-gray-700">{payment.reason}</p>
            </div>
          )}

          <div className="bg-green-50 border-2 border-green-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(payment.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <span className="inline-block px-3 py-1.5 bg-green-600 text-white rounded font-semibold text-sm">
                  {payment.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">Employee Signature</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Signature & Date</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-4">Authorized By</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Signature & Date</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 mt-4 text-center text-xs text-gray-500">
            <p>This is an official payment slip generated by Great Pearl Coffee</p>
            <p className="mt-1">Printed on: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-content, #payslip-content * {
            visibility: visible;
          }
          #payslip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}

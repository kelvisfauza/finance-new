import { formatCurrency, formatDate } from '../lib/utils'

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
    created_at: string
  }
  employeeDetails?: {
    name: string
    employee_id?: string
    department?: string
    position?: string
  }
}

export const PayslipPrint = ({ payment, employeeDetails }: PayslipPrintProps) => {
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm print:hidden"
      >
        Print Payslip
      </button>

      <div className="hidden print:block print:p-8">
        <div className="max-w-4xl mx-auto bg-white">
          <div className="border-b-4 border-blue-600 pb-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">GP</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Great Pearl Finance</h1>
                  <p className="text-gray-600 mt-1">Financial Management Portal</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Payment Slip</p>
                <p className="text-lg font-semibold text-gray-900">#{payment.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Employee Details</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-gray-900">{employeeDetails?.name || payment.requested_by}</p>
                </div>
                {employeeDetails?.employee_id && (
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-semibold text-gray-900">{employeeDetails.employee_id}</p>
                  </div>
                )}
                {employeeDetails?.department && (
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold text-gray-900">{employeeDetails.department}</p>
                  </div>
                )}
                {employeeDetails?.position && (
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="font-semibold text-gray-900">{employeeDetails.position}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Payment Details</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Payment Type</p>
                  <p className="font-semibold text-gray-900">{payment.request_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Request Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(payment.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approval Date</p>
                  <p className="font-semibold text-gray-900">
                    {payment.approved_at ? formatDate(payment.approved_at) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved By</p>
                  <p className="font-semibold text-gray-900">{payment.approved_by || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {payment.reason && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Payment Reason</h2>
              <p className="text-gray-700">{payment.reason}</p>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-4xl font-bold text-blue-600">{formatCurrency(payment.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">
                  {payment.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
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

          <div className="border-t pt-4 mt-8 text-center text-xs text-gray-500">
            <p>This is an official payment slip generated by Great Pearl Finance Portal</p>
            <p className="mt-1">Printed on: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
      `}</style>
    </>
  )
}

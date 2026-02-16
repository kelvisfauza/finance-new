import { formatCurrency, formatDate } from '../lib/utils'

interface CoffeeLot {
  id: string
  coffee_record_id?: string
  supplier_name?: string
  supplier_code?: string
  batch_number?: string
  assessed_by: string
  assessed_at: string
  unit_price_ugx: number
  quantity_kg: number
  total_amount_ugx: number
  finance_status: string
  updated_at: string
  payment_source?: 'coffee_lots' | 'cash_management'
}

interface CoffeePaymentReceiptProps {
  lot: CoffeeLot
  referenceNumber?: string
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return ''

    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) {
      const ten = Math.floor(n / 10)
      const one = n % 10
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '')
    }

    const hundred = Math.floor(n / 100)
    const remainder = n % 100
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' and ' + convertLessThanThousand(remainder) : '')
  }

  if (num === 0) return 'Zero'

  const billion = Math.floor(num / 1000000000)
  const million = Math.floor((num % 1000000000) / 1000000)
  const thousand = Math.floor((num % 1000000) / 1000)
  const remainder = Math.floor(num % 1000)

  let result = ''

  if (billion > 0) result += convertLessThanThousand(billion) + ' Billion '
  if (million > 0) result += convertLessThanThousand(million) + ' Million '
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand '
  if (remainder > 0) result += convertLessThanThousand(remainder)

  return result.trim() + ' Shillings Only'
}

export const CoffeePaymentReceipt = ({ lot, referenceNumber }: CoffeePaymentReceiptProps) => {
  const handlePrint = () => {
    const printContent = document.getElementById('payment-receipt')
    if (!printContent) return

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${lot.coffee_record_id || 'N/A'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 30px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { width: 120px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 5px; }
            .company-details { font-size: 12px; color: #666; line-height: 1.6; }
            .receipt-title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; padding: 10px; background: #f3f4f6; border: 1px solid #d1d5db; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #059669; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
            .detail-label { font-weight: 600; color: #374151; }
            .detail-value { color: #111827; }
            .amount-section { background: #f0fdf4; padding: 15px; border: 2px solid #059669; margin: 20px 0; border-radius: 5px; }
            .amount-figures { font-size: 24px; font-weight: bold; color: #059669; text-align: center; margin-bottom: 10px; }
            .amount-words { font-size: 14px; text-align: center; font-style: italic; color: #374151; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; }
            .signature-line { width: 200px; border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            .print-info { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print {
              body { padding: 0; }
              .receipt { border: none; }
              .print-info { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const bags = Math.round(lot.quantity_kg / 60)
  const reference = referenceNumber || lot.batch_number || lot.coffee_record_id || 'N/A'

  return (
    <div>
      <div id="payment-receipt" style={{ display: 'none' }}>
        <div className="receipt">
          <div className="header">
            <img src="/gpcf-logo.png" alt="Company Logo" className="logo" />
            <div className="company-name">GREAT PEARL COFFEE FARMERS</div>
            <div className="company-details">
              Kampala, Uganda<br />
              Tel: +256 XXX XXX XXX | Email: info@greatpearlcoffee.com<br />
              TIN: XXXXXXXXXX
            </div>
          </div>

          <div className="receipt-title">COFFEE PAYMENT RECEIPT</div>

          <div className="section">
            <div className="detail-row">
              <span className="detail-label">Receipt No:</span>
              <span className="detail-value">{reference}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formatDate(lot.updated_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Record ID:</span>
              <span className="detail-value">{lot.coffee_record_id || 'N/A'}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-title">SUPPLIER INFORMATION</div>
            <div className="detail-row">
              <span className="detail-label">Supplier Name:</span>
              <span className="detail-value">{lot.supplier_name || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Supplier Code:</span>
              <span className="detail-value">{lot.supplier_code || 'N/A'}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-title">COFFEE DETAILS</div>
            <div className="detail-row">
              <span className="detail-label">Batch Number:</span>
              <span className="detail-value">{lot.batch_number || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date Supplied:</span>
              <span className="detail-value">{formatDate(lot.assessed_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Quantity:</span>
              <span className="detail-value">{lot.quantity_kg.toFixed(2)} kg ({bags} bags)</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Unit Price:</span>
              <span className="detail-value">{formatCurrency(lot.unit_price_ugx)} per kg</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Assessed By:</span>
              <span className="detail-value">{lot.assessed_by}</span>
            </div>
          </div>

          <div className="amount-section">
            <div className="amount-figures">{formatCurrency(lot.total_amount_ugx)}</div>
            <div className="amount-words">
              Amount in Words: <strong>{numberToWords(lot.total_amount_ugx)}</strong>
            </div>
          </div>

          <div className="section">
            <div className="detail-row">
              <span className="detail-label">Payment Status:</span>
              <span className="detail-value">{lot.finance_status}</span>
            </div>
            {lot.payment_source === 'cash_management' && (
              <div className="detail-row">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value">Via Cash Management</span>
              </div>
            )}
          </div>

          <div className="footer">
            <div className="signature-box">
              <div className="signature-line">Prepared By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Approved By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Received By</div>
            </div>
          </div>

          <div className="print-info">
            This is a computer-generated receipt. Printed on {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Receipt
      </button>
    </div>
  )
}

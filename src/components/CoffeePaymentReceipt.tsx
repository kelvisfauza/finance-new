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
    const bags = Math.round(lot.quantity_kg / 60)
    const reference = referenceNumber || lot.batch_number || lot.coffee_record_id || 'N/A'
    const amountInWords = numberToWords(lot.total_amount_ugx)
    const logoUrl = window.location.origin + '/gpcf-logo.png'

    const receiptDate = formatDate(lot.updated_at)
    const suppliedDate = formatDate(lot.assessed_at)
    const quantityText = `${lot.quantity_kg.toFixed(2)} kg (${bags} bags)`
    const unitPriceText = `${formatCurrency(lot.unit_price_ugx)} per kg`
    const totalAmountText = formatCurrency(lot.total_amount_ugx)
    const printDateTime = new Date().toLocaleString()
    const paymentMethodHtml = lot.payment_source === 'cash_management'
      ? `<div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">Via Cash Management</span>
        </div>`
      : ''

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${lot.coffee_record_id || 'N/A'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 15px; background: white; }
            .receipt { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 20px; background: white; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 12px; }
            .logo { width: 100px; height: auto; margin-bottom: 8px; }
            .company-name { font-size: 20px; font-weight: bold; color: #000; margin-bottom: 3px; }
            .company-tagline { font-size: 11px; color: #000; font-style: italic; margin-bottom: 5px; }
            .company-details { font-size: 10px; color: #000; line-height: 1.4; }
            .receipt-title { font-size: 18px; font-weight: bold; text-align: center; margin: 12px 0; padding: 8px; background: #fff; border: 2px solid #000; }
            .section { margin-bottom: 12px; }
            .section-title { font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #000; border-bottom: 1px solid #000; padding-bottom: 3px; }
            .detail-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #000; font-size: 11px; }
            .detail-label { font-weight: 600; color: #000; }
            .detail-value { color: #000; }
            .amount-section { background: #fff; padding: 10px; border: 2px solid #000; margin: 12px 0; }
            .amount-figures { font-size: 20px; font-weight: bold; color: #000; text-align: center; margin-bottom: 6px; }
            .amount-words { font-size: 11px; text-align: center; font-style: italic; color: #000; }
            .footer { margin-top: 20px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; }
            .signature-line { width: 160px; border-top: 1px solid #000; margin-top: 30px; padding-top: 5px; font-size: 10px; color: #000; }
            .print-info { text-align: center; font-size: 9px; color: #000; margin-top: 15px; border-top: 1px solid #000; padding-top: 8px; }
            @media print {
              body { padding: 0; background: white; }
              .receipt { border: 2px solid #000; padding: 20px; }
              .print-info { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="${logoUrl}" alt="Company Logo" class="logo" onerror="this.style.display='none'" />
              <div class="company-name">GREAT PEARL COFFEE</div>
              <div class="company-tagline">delivering coffee from the heart of rwenzori</div>
              <div class="company-details">
                www.greatpearlcoffee.com | info@greatpearlcoffee.com | +256393001626
              </div>
            </div>

            <div class="receipt-title">COFFEE PAYMENT RECEIPT</div>

            <div class="section">
              <div class="detail-row">
                <span class="detail-label">Receipt No:</span>
                <span class="detail-value">${reference}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${receiptDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Record ID:</span>
                <span class="detail-value">${lot.coffee_record_id || 'N/A'}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">SUPPLIER INFORMATION</div>
              <div class="detail-row">
                <span class="detail-label">Supplier Name:</span>
                <span class="detail-value">${lot.supplier_name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Supplier Code:</span>
                <span class="detail-value">${lot.supplier_code || 'N/A'}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">COFFEE DETAILS</div>
              <div class="detail-row">
                <span class="detail-label">Batch Number:</span>
                <span class="detail-value">${lot.batch_number || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date Supplied:</span>
                <span class="detail-value">${suppliedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quantity:</span>
                <span class="detail-value">${quantityText}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Unit Price:</span>
                <span class="detail-value">${unitPriceText}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Assessed By:</span>
                <span class="detail-value">${lot.assessed_by}</span>
              </div>
            </div>

            <div class="amount-section">
              <div class="amount-figures">${totalAmountText}</div>
              <div class="amount-words">
                Amount in Words: <strong>${amountInWords}</strong>
              </div>
            </div>

            <div class="section">
              <div class="detail-row">
                <span class="detail-label">Payment Status:</span>
                <span class="detail-value">${lot.finance_status}</span>
              </div>
              ${paymentMethodHtml}
            </div>

            <div class="footer">
              <div class="signature-box">
                <div class="signature-line">Prepared By</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Approved By</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Received By</div>
              </div>
            </div>

            <div class="print-info">
              This is a computer-generated receipt. Printed on ${printDateTime}
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to print the receipt')
      return
    }

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 250)
  }

  return (
    <button
      onClick={handlePrint}
      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Receipt
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [error, setError] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = 'qr-reader'

  useEffect(() => {
    startScanner()

    return () => {
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    try {
      setError('')
      setScanning(true)

      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          const code = extractCodeFromUrl(decodedText)
          onScan(code)
          stopScanner()
        },
        (errorMessage) => {
        }
      )
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      setError(err.message || 'Failed to access camera. Please ensure camera permissions are granted.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  const extractCodeFromUrl = (text: string): string => {
    const urlPattern = /\/verify\/([A-Z0-9-]+)/i
    const match = text.match(urlPattern)
    if (match && match[1]) {
      return match[1]
    }
    return text
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={startScanner}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                id={qrCodeRegionId}
                className="rounded-lg overflow-hidden border-4 border-emerald-500"
                style={{ width: '100%' }}
              />
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">Position the QR code within the frame</p>
                <p className="text-xs text-gray-500">
                  The scanner will automatically detect and verify the code
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleClose}
            className="w-full mt-6 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

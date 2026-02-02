import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, Camera } from 'lucide-react'
import { QRScanner } from '../components/QRScanner'

export const VerifySearch = () => {
  const [code, setCode] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      navigate(`/verify/${code.trim()}`)
    }
  }

  const handleScan = (scannedCode: string) => {
    setShowScanner(false)
    navigate(`/verify/${scannedCode.trim()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-8 text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/gpcf-logo.png"
                alt="Great Pearl Coffee Factory"
                className="h-24 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Great Pearl Coffee Factory
            </h1>
            <p className="text-emerald-100 text-lg">
              Document & Employee Verification System
            </p>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-emerald-100 rounded-full">
                <Shield className="w-12 h-12 text-emerald-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Verify Authenticity
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Scan the QR code or enter the verification code manually
            </p>

            <button
              onClick={() => setShowScanner(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 text-lg shadow-lg mb-6"
            >
              <Camera className="w-6 h-6" />
              Scan QR Code
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">OR ENTER MANUALLY</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., GPCF-TRD-0001"
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 text-lg shadow-lg"
              >
                <Search className="w-5 h-5" />
                Verify Now
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 text-center">Contact Information</h3>
              <div className="space-y-2 text-center text-sm text-gray-600">
                <p>
                  <span className="font-medium">Website:</span>{' '}
                  <a href="http://www.greatpearlcoffee.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    www.greatpearlcoffee.com
                  </a>
                </p>
                <p>
                  <span className="font-medium">Tel:</span>{' '}
                  <a href="tel:+256781121639" className="text-emerald-600 hover:underline">
                    +256 781 121 639
                  </a>
                </p>
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <a href="mailto:info@greatpearlcoffee.com" className="text-emerald-600 hover:underline">
                    info@greatpearlcoffee.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Scan the QR code on your document or enter the code manually</p>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

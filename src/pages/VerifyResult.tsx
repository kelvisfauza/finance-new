import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, AlertTriangle, Search, User, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'

interface Verification {
  id: string
  code: string
  type: 'employee_id' | 'document'
  subtype: string
  status: 'verified' | 'expired' | 'revoked'
  issued_to_name: string
  employee_no: string | null
  position: string | null
  department: string | null
  workstation: string | null
  photo_url: string | null
  issued_at: string
  valid_until: string | null
  reference_no: string | null
  file_url: string | null
  meta: any
  revoked_reason: string | null
}

export const VerifyResult = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [verification, setVerification] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (code) {
      fetchVerification(code)
    }
  }, [code])

  const fetchVerification = async (verificationCode: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('code', verificationCode.toUpperCase())
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setNotFound(true)
      } else {
        const currentStatus = determineCurrentStatus(data)
        setVerification({ ...data, status: currentStatus })
      }
    } catch (error) {
      console.error('Error fetching verification:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const determineCurrentStatus = (data: any): 'verified' | 'expired' | 'revoked' => {
    if (data.status === 'revoked') return 'revoked'

    if (data.valid_until) {
      const validUntil = new Date(data.valid_until)
      if (validUntil < new Date()) {
        return 'expired'
      }
    }

    return data.status
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          label: 'VERIFIED',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-500'
        }
      case 'expired':
        return {
          icon: Clock,
          label: 'EXPIRED',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-500'
        }
      case 'revoked':
        return {
          icon: XCircle,
          label: 'REVOKED',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-500'
        }
      default:
        return {
          icon: AlertTriangle,
          label: 'NOT FOUND',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-500'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying...</p>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(notFound ? 'not_found' : verification?.status || 'not_found')
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-center">
            <img
              src="/gpcf-logo.png"
              alt="Great Pearl Coffee Factory"
              className="h-16 w-auto mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-white">
              Great Pearl Coffee Factory
            </h1>
          </div>

          <div className="p-8">
            <div className={`flex items-center justify-center gap-4 p-6 rounded-xl border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} mb-6`}>
              <StatusIcon className={`w-12 h-12 ${statusConfig.textColor}`} />
              <span className={`text-3xl font-bold ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>

            {notFound ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verification Code Not Found
                </h2>
                <p className="text-gray-600 mb-6">
                  The code <span className="font-mono font-semibold">{code}</span> could not be found in our system.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Please check the code and try again, or contact us for assistance.
                </p>
              </div>
            ) : verification && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  {verification.type === 'employee_id' ? (
                    <User className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-emerald-600" />
                  )}
                  <h2 className="text-xl font-bold text-gray-900">
                    {verification.type === 'employee_id' ? 'Employee ID' : 'Document'}
                  </h2>
                </div>

                {verification.type === 'employee_id' ? (
                  <div className="space-y-4">
                    {verification.photo_url && (
                      <div className="flex justify-center mb-6">
                        <img
                          src={verification.photo_url}
                          alt={verification.issued_to_name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-emerald-200"
                        />
                      </div>
                    )}

                    <InfoRow label="Full Name" value={verification.issued_to_name} />
                    <InfoRow label="Employee Number" value={verification.employee_no} />
                    <InfoRow label="Position" value={verification.position} />
                    <InfoRow label="Department" value={verification.department} />
                    <InfoRow label="Work Station" value={verification.workstation} />
                    <InfoRow label="Verification Code" value={verification.code} mono />
                    <InfoRow label="Issue Date" value={format(new Date(verification.issued_at), 'PPP')} />
                    {verification.valid_until && (
                      <InfoRow label="Valid Until" value={format(new Date(verification.valid_until), 'PPP')} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <InfoRow label="Document Type" value={verification.subtype} />
                    <InfoRow label="Reference Number" value={verification.reference_no} />
                    <InfoRow label="Issued To" value={verification.issued_to_name} />
                    {verification.employee_no && (
                      <InfoRow label="Employee Number" value={verification.employee_no} />
                    )}
                    <InfoRow label="Department" value={verification.department} />
                    <InfoRow label="Verification Code" value={verification.code} mono />
                    <InfoRow label="Issue Date" value={format(new Date(verification.issued_at), 'PPP')} />

                    {verification.meta && Object.keys(verification.meta).length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
                        <div className="space-y-2 text-sm">
                          {Object.entries(verification.meta).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-900 font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {verification.status === 'revoked' && verification.revoked_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2">Revocation Reason</h3>
                    <p className="text-red-800">{verification.revoked_reason}</p>
                  </div>
                )}
              </div>
            )}

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

            <button
              onClick={() => navigate('/verify')}
              className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Verify Another Code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) => {
  if (!value) return null

  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100">
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className={`text-gray-900 font-semibold text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

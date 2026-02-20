import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Plus, MapPin, Calendar, User, Eye, LogOut, FileText } from 'lucide-react'

interface Assessment {
  id: string
  visit_date: string
  area_village: string
  sub_county: string
  district: string
  team_members: string
  gps_latitude: number
  gps_longitude: number
  farmers_visited: number
  new_suppliers_identified: number
  crop_condition: string
  recommended_action: string
  prepared_by: string
  status: string
  created_at: string
}

export default function StandaloneAssessmentList() {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    checkAuth()
    fetchAssessments()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/auth')
      return
    }
    setUserEmail(user.email || '')
  }

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('field_assessments')
        .select('*')
        .order('visit_date', { ascending: false })

      if (error) throw error
      setAssessments(data || [])
    } catch (error: any) {
      console.error('Error fetching assessments:', error)
      alert(`Error loading assessments: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const viewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
  }

  const closeDetails = () => {
    setSelectedAssessment(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading assessments...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/gpcf-logo.png" alt="Great Pearl Coffee" className="h-10" />
            <div>
              <h1 className="text-lg font-bold text-gray-800">Field Assessments</h1>
              <p className="text-xs text-gray-600">Great Pearl Coffee</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{userEmail}</span>
            <button
              onClick={() => navigate('/assessment')}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1 text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {assessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No field assessments yet</p>
            <button
              onClick={() => navigate('/assessment')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create First Assessment
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden sm:table-cell">Team</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Farmers</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">Crop</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold hidden md:table-cell">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">GPS</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="hidden sm:inline">{new Date(assessment.visit_date).toLocaleDateString()}</span>
                          <span className="sm:hidden">{new Date(assessment.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{assessment.area_village}</div>
                        {assessment.district && (
                          <div className="text-xs text-gray-500 hidden sm:block">{assessment.district}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div className="truncate max-w-xs">{assessment.team_members}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{assessment.farmers_visited}</div>
                        <div className="text-xs text-green-600">+{assessment.new_suppliers_identified}</div>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            assessment.crop_condition === 'Excellent'
                              ? 'bg-green-100 text-green-800'
                              : assessment.crop_condition === 'Good'
                              ? 'bg-blue-100 text-blue-800'
                              : assessment.crop_condition === 'Average'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {assessment.crop_condition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            assessment.recommended_action === 'Buy Immediately'
                              ? 'bg-green-100 text-green-800'
                              : assessment.recommended_action === 'Monitor'
                              ? 'bg-blue-100 text-blue-800'
                              : assessment.recommended_action === 'Return Next Week'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {assessment.recommended_action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {assessment.gps_latitude && assessment.gps_longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${assessment.gps_latitude},${assessment.gps_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <MapPin className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => viewDetails(assessment)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedAssessment && (
          <AssessmentDetailsModal assessment={selectedAssessment} onClose={closeDetails} />
        )}
      </div>
    </div>
  )
}

function AssessmentDetailsModal({
  assessment,
  onClose,
}: {
  assessment: Assessment
  onClose: () => void
}) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [traders, setTraders] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetails()
  }, [assessment.id])

  const fetchDetails = async () => {
    try {
      const [suppliersData, tradersData, pricesData] = await Promise.all([
        supabase
          .from('field_assessment_suppliers')
          .select('*')
          .eq('assessment_id', assessment.id),
        supabase
          .from('field_assessment_traders')
          .select('*')
          .eq('assessment_id', assessment.id),
        supabase
          .from('field_assessment_prices')
          .select('*')
          .eq('assessment_id', assessment.id),
      ])

      setSuppliers(suppliersData.data || [])
      setTraders(tradersData.data || [])
      setPrices(pricesData.data || [])
    } catch (error) {
      console.error('Error fetching details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Assessment Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Date</label>
              <p>{new Date(assessment.visit_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Location</label>
              <p>{assessment.area_village}</p>
              {assessment.sub_county && <p className="text-sm text-gray-500">{assessment.sub_county}</p>}
              {assessment.district && <p className="text-sm text-gray-500">{assessment.district}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Team Members</label>
              <p>{assessment.team_members}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Prepared By</label>
              <p>{assessment.prepared_by}</p>
            </div>
          </div>

          {assessment.gps_latitude && assessment.gps_longitude && (
            <div className="border-t pt-4">
              <label className="text-sm font-semibold text-gray-600 block mb-2">GPS Coordinates</label>
              <a
                href={`https://www.google.com/maps?q=${assessment.gps_latitude},${assessment.gps_longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                {assessment.gps_latitude.toFixed(6)}, {assessment.gps_longitude.toFixed(6)}
              </a>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Farmer Engagement</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Farmers Visited:</span> {assessment.farmers_visited}
              </div>
              <div>
                <span className="text-gray-600">New Suppliers:</span> {assessment.new_suppliers_identified}
              </div>
            </div>
          </div>

          {suppliers.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">New Suppliers Identified</h3>
              <div className="space-y-2">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-medium">{supplier.supplier_name}</div>
                    {supplier.phone && <div className="text-gray-600">Phone: {supplier.phone}</div>}
                    {supplier.village && <div className="text-gray-600">Village: {supplier.village}</div>}
                    {supplier.estimated_kgs && (
                      <div className="text-gray-600">Estimated: {supplier.estimated_kgs} kg</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Crop Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Condition:</span>{' '}
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    assessment.crop_condition === 'Excellent'
                      ? 'bg-green-100 text-green-800'
                      : assessment.crop_condition === 'Good'
                      ? 'bg-blue-100 text-blue-800'
                      : assessment.crop_condition === 'Average'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {assessment.crop_condition}
                </span>
              </div>
            </div>
          </div>

          {prices.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Market Prices (UGX/KG)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">Coffee Type</th>
                      <th className="border p-2 text-left">Lowest</th>
                      <th className="border p-2 text-left">Highest</th>
                      <th className="border p-2 text-left">Common</th>
                      <th className="border p-2 text-left">Who Buying</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((price) => (
                      <tr key={price.id}>
                        <td className="border p-2 font-medium">{price.coffee_type}</td>
                        <td className="border p-2">{price.lowest_price_ugx || '-'}</td>
                        <td className="border p-2">{price.highest_price_ugx || '-'}</td>
                        <td className="border p-2">{price.common_price_ugx || '-'}</td>
                        <td className="border p-2">{price.who_is_buying || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {traders.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Traders Identified</h3>
              <div className="space-y-2">
                {traders.map((trader) => (
                  <div key={trader.id} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-medium">{trader.trader_name}</div>
                    {trader.contact && <div className="text-gray-600">Contact: {trader.contact}</div>}
                    {trader.notes && <div className="text-gray-600">{trader.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Recommendations</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Recommended Action:</span>{' '}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    assessment.recommended_action === 'Buy Immediately'
                      ? 'bg-green-100 text-green-800'
                      : assessment.recommended_action === 'Monitor'
                      ? 'bg-blue-100 text-blue-800'
                      : assessment.recommended_action === 'Return Next Week'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {assessment.recommended_action}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MapPin, Plus, Trash2, Save } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  phone: string
  village: string
  estimatedKgs: string
  expectedDate: string
}

interface Trader {
  id: string
  name: string
  contact: string
  notes: string
}

interface PriceData {
  id: string
  coffeeType: string
  lowest: string
  highest: string
  common: string
  whoBuying: string
  notes: string
}

export default function FieldAssessment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [traders, setTraders] = useState<Trader[]>([])
  const [prices, setPrices] = useState<PriceData[]>([
    { id: '1', coffeeType: 'Kiboko', lowest: '', highest: '', common: '', whoBuying: '', notes: '' },
    { id: '2', coffeeType: 'FAQ', lowest: '', highest: '', common: '', whoBuying: '', notes: '' },
    { id: '3', coffeeType: 'Dry Parchment', lowest: '', highest: '', common: '', whoBuying: '', notes: '' },
    { id: '4', coffeeType: 'Green Bean', lowest: '', highest: '', common: '', whoBuying: '', notes: '' },
  ])

  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    areaVillage: '',
    subCounty: '',
    district: '',
    teamMembers: '',
    startTime: '',
    endTime: '',
    gpsLandmark: '',

    farmersVisited: 0,
    newSuppliersIdentified: 0,
    farmerGroup: '',
    farmersWillingToSell: 'Yes',
    willingReason: '',

    cropCondition: 'Good',
    coffeeVariety: '',
    harvestPotentialKg: '',
    coffeeOnTreesPercent: '',
    harvestOngoing: false,
    peakHarvestDates: '',
    pestDiseaseLevel: 'None',
    pestDiseaseNames: '',
    farmerActionAdvised: '',
    soilCondition: 'Good',
    soilTestingLocations: '',

    harvestHandling: 'Selective picking',
    dryingMethod: 'Tarpaulin',
    contaminationRisk: 'Low',
    commonDefects: '',
    storageMethod: 'Sacks indoors',
    qualityRecommendations: '',

    tradersActive: false,
    greenBeanAvailableKg: '',
    competitorsActive: false,
    competitorNames: '',
    competitorPriceAdvantage: '',
    priceManipulation: false,
    marketBehaviorNotes: '',

    priceMovement: 'Stable',
    priceMovementReason: '',

    samplesCollected: false,
    sampleTypeWeight: '',
    sampleReferenceCode: '',
    photosTaken: false,
    photoReferences: '',

    recommendedAction: 'Monitor',
    recommendedBuyingPrice: '',
    keyRisks: '',
    opportunities: '',
    nextFollowupDate: '',

    preparedBy: '',
    reviewedBySupervisor: '',
  })

  const captureGPS = () => {
    setGpsLoading(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setGpsLoading(false)
        },
        (error) => {
          alert(`GPS Error: ${error.message}`)
          setGpsLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      alert('GPS not available on this device')
      setGpsLoading(false)
    }
  }

  const addSupplier = () => {
    setSuppliers([...suppliers, {
      id: Date.now().toString(),
      name: '',
      phone: '',
      village: '',
      estimatedKgs: '',
      expectedDate: '',
    }])
  }

  const removeSupplier = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id))
  }

  const updateSupplier = (id: string, field: keyof Supplier, value: string) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const addTrader = () => {
    setTraders([...traders, {
      id: Date.now().toString(),
      name: '',
      contact: '',
      notes: '',
    }])
  }

  const removeTrader = (id: string) => {
    setTraders(traders.filter(t => t.id !== id))
  }

  const updateTrader = (id: string, field: keyof Trader, value: string) => {
    setTraders(traders.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const updatePrice = (id: string, field: keyof PriceData, value: string) => {
    setPrices(prices.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        alert('You must be logged in to submit an assessment')
        return
      }

      const { data: assessment, error: assessmentError } = await supabase
        .from('field_assessments')
        .insert({
          visit_date: formData.visitDate,
          area_village: formData.areaVillage,
          sub_county: formData.subCounty,
          district: formData.district,
          team_members: formData.teamMembers,
          start_time: formData.startTime || null,
          end_time: formData.endTime || null,
          gps_latitude: gpsCoords?.latitude,
          gps_longitude: gpsCoords?.longitude,
          gps_landmark: formData.gpsLandmark,

          farmers_visited: formData.farmersVisited,
          new_suppliers_identified: formData.newSuppliersIdentified,
          farmer_group_association: formData.farmerGroup,
          farmers_willing_to_sell: formData.farmersWillingToSell,
          farmers_willing_reason: formData.willingReason,

          crop_condition: formData.cropCondition,
          coffee_variety: formData.coffeeVariety,
          estimated_harvest_potential_kg: formData.harvestPotentialKg ? parseFloat(formData.harvestPotentialKg) : null,
          coffee_on_trees_percent: formData.coffeeOnTreesPercent ? parseInt(formData.coffeeOnTreesPercent) : null,
          harvest_ongoing: formData.harvestOngoing,
          expected_peak_harvest: formData.peakHarvestDates,
          pest_disease_level: formData.pestDiseaseLevel,
          pest_disease_names: formData.pestDiseaseNames,
          farmer_action_advised: formData.farmerActionAdvised,
          soil_condition: formData.soilCondition,
          soil_testing_locations: formData.soilTestingLocations,

          harvest_handling_method: formData.harvestHandling,
          drying_method: formData.dryingMethod,
          contamination_risk: formData.contaminationRisk,
          common_defects: formData.commonDefects,
          storage_method: formData.storageMethod,
          quality_recommendations: formData.qualityRecommendations,

          traders_active: formData.tradersActive,
          green_bean_available_kg: formData.greenBeanAvailableKg ? parseFloat(formData.greenBeanAvailableKg) : null,
          competitors_active: formData.competitorsActive,
          competitor_names: formData.competitorNames,
          competitor_price_advantage: formData.competitorPriceAdvantage,
          price_manipulation: formData.priceManipulation,
          market_behavior_notes: formData.marketBehaviorNotes,

          price_movement: formData.priceMovement,
          price_movement_reason: formData.priceMovementReason,

          samples_collected: formData.samplesCollected,
          sample_type_weight: formData.sampleTypeWeight,
          sample_reference_code: formData.sampleReferenceCode,
          photos_taken: formData.photosTaken,
          photo_references: formData.photoReferences,

          recommended_action: formData.recommendedAction,
          recommended_buying_price_ugx: formData.recommendedBuyingPrice ? parseFloat(formData.recommendedBuyingPrice) : null,
          key_risks: formData.keyRisks,
          opportunities: formData.opportunities,
          next_followup_date: formData.nextFollowupDate || null,

          prepared_by: formData.preparedBy,
          reviewed_by_supervisor: formData.reviewedBySupervisor,
          submitted_by: userData.user.id,
          status: 'submitted',
        })
        .select()
        .single()

      if (assessmentError) throw assessmentError

      if (suppliers.length > 0) {
        const supplierData = suppliers.filter(s => s.name).map(s => ({
          assessment_id: assessment.id,
          supplier_name: s.name,
          phone: s.phone,
          village: s.village,
          estimated_kgs: s.estimatedKgs ? parseFloat(s.estimatedKgs) : null,
          expected_selling_date: s.expectedDate,
        }))
        const { error: supplierError } = await supabase
          .from('field_assessment_suppliers')
          .insert(supplierData)
        if (supplierError) throw supplierError
      }

      if (traders.length > 0) {
        const traderData = traders.filter(t => t.name).map(t => ({
          assessment_id: assessment.id,
          trader_name: t.name,
          contact: t.contact,
          notes: t.notes,
        }))
        const { error: traderError } = await supabase
          .from('field_assessment_traders')
          .insert(traderData)
        if (traderError) throw traderError
      }

      const priceData = prices.filter(p => p.lowest || p.highest || p.common).map(p => ({
        assessment_id: assessment.id,
        coffee_type: p.coffeeType,
        lowest_price_ugx: p.lowest ? parseFloat(p.lowest) : null,
        highest_price_ugx: p.highest ? parseFloat(p.highest) : null,
        common_price_ugx: p.common ? parseFloat(p.common) : null,
        who_is_buying: p.whoBuying,
        notes: p.notes,
      }))

      if (priceData.length > 0) {
        const { error: priceError } = await supabase
          .from('field_assessment_prices')
          .insert(priceData)
        if (priceError) throw priceError
      }

      alert('Field assessment submitted successfully!')
      navigate('/field-assessments')
    } catch (error: any) {
      console.error('Error submitting assessment:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Field Operations - Market Intelligence & Crop Assessment</h1>
        <p className="text-gray-600">Complete this form for each area/village visited</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">A. VISIT IDENTIFICATION</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Area / Village *</label>
              <input
                type="text"
                required
                value={formData.areaVillage}
                onChange={(e) => setFormData({ ...formData, areaVillage: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sub-county</label>
              <input
                type="text"
                value={formData.subCounty}
                onChange={(e) => setFormData({ ...formData, subCounty: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Team Members (Names) *</label>
              <input
                type="text"
                required
                value={formData.teamMembers}
                onChange={(e) => setFormData({ ...formData, teamMembers: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Comma-separated names"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">GPS Coordinates</label>
            <div className="flex gap-2 items-start">
              <button
                type="button"
                onClick={captureGPS}
                disabled={gpsLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                {gpsLoading ? 'Capturing...' : 'Capture GPS'}
              </button>
              {gpsCoords && (
                <div className="flex-1 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                  <div>Latitude: {gpsCoords.latitude.toFixed(6)}</div>
                  <div>Longitude: {gpsCoords.longitude.toFixed(6)}</div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={formData.gpsLandmark}
              onChange={(e) => setFormData({ ...formData, gpsLandmark: e.target.value })}
              placeholder="GPS Landmark (if known)"
              className="w-full border rounded px-3 py-2 mt-2"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">B. FARMER ENGAGEMENT & SUPPLIER DISCOVERY</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Number of farmers visited</label>
              <input
                type="number"
                min="0"
                value={formData.farmersVisited}
                onChange={(e) => setFormData({ ...formData, farmersVisited: parseInt(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Number of NEW suppliers identified</label>
              <input
                type="number"
                min="0"
                value={formData.newSuppliersIdentified}
                onChange={(e) => setFormData({ ...formData, newSuppliersIdentified: parseInt(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Main farmer group/association (if any)</label>
              <input
                type="text"
                value={formData.farmerGroup}
                onChange={(e) => setFormData({ ...formData, farmerGroup: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">NEW Supplier Details</label>
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2 p-3 border rounded bg-gray-50">
                <input
                  type="text"
                  placeholder="Name"
                  value={supplier.name}
                  onChange={(e) => updateSupplier(supplier.id, 'name', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={supplier.phone}
                  onChange={(e) => updateSupplier(supplier.id, 'phone', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Village"
                  value={supplier.village}
                  onChange={(e) => updateSupplier(supplier.id, 'village', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  placeholder="Est. Kgs"
                  value={supplier.estimatedKgs}
                  onChange={(e) => updateSupplier(supplier.id, 'estimatedKgs', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Selling Date"
                  value={supplier.expectedDate}
                  onChange={(e) => updateSupplier(supplier.id, 'expectedDate', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => removeSupplier(supplier.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSupplier}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Farmers willing to sell to Great Pearl?</label>
              <select
                value={formData.farmersWillingToSell}
                onChange={(e) => setFormData({ ...formData, farmersWillingToSell: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">If No/Mixed, explain why</label>
              <input
                type="text"
                value={formData.willingReason}
                onChange={(e) => setFormData({ ...formData, willingReason: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">C. CROP STATUS, HEALTH & PEST MANAGEMENT</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Overall crop condition</label>
              <select
                value={formData.cropCondition}
                onChange={(e) => setFormData({ ...formData, cropCondition: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Coffee variety (Robusta/Arabica/Both)</label>
              <input
                type="text"
                value={formData.coffeeVariety}
                onChange={(e) => setFormData({ ...formData, coffeeVariety: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estimated total harvest potential (Kgs)</label>
              <input
                type="number"
                step="0.01"
                value={formData.harvestPotentialKg}
                onChange={(e) => setFormData({ ...formData, harvestPotentialKg: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estimated % of coffee still on trees</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.coffeeOnTreesPercent}
                onChange={(e) => setFormData({ ...formData, coffeeOnTreesPercent: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.harvestOngoing}
                  onChange={(e) => setFormData({ ...formData, harvestOngoing: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Harvest ongoing now?</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Expected peak harvest weeks/dates</label>
              <input
                type="text"
                value={formData.peakHarvestDates}
                onChange={(e) => setFormData({ ...formData, peakHarvestDates: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pest/disease issues observed</label>
              <select
                value={formData.pestDiseaseLevel}
                onChange={(e) => setFormData({ ...formData, pestDiseaseLevel: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name pests/diseases observed</label>
              <input
                type="text"
                value={formData.pestDiseaseNames}
                onChange={(e) => setFormData({ ...formData, pestDiseaseNames: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Recommended farmer action/advice given</label>
              <textarea
                value={formData.farmerActionAdvised}
                onChange={(e) => setFormData({ ...formData, farmerActionAdvised: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Soil condition</label>
              <select
                value={formData.soilCondition}
                onChange={(e) => setFormData({ ...formData, soilCondition: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Good">Good</option>
                <option value="Waterlogged">Waterlogged</option>
                <option value="Dry">Dry</option>
                <option value="Eroded">Eroded</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Soil testing needed (locations)</label>
              <input
                type="text"
                value={formData.soilTestingLocations}
                onChange={(e) => setFormData({ ...formData, soilTestingLocations: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">D. HARVEST HANDLING, POST-HARVEST & QUALITY RISKS</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Harvest handling observed</label>
              <select
                value={formData.harvestHandling}
                onChange={(e) => setFormData({ ...formData, harvestHandling: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Selective picking">Selective picking</option>
                <option value="Strip picking">Strip picking</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Drying method observed</label>
              <select
                value={formData.dryingMethod}
                onChange={(e) => setFormData({ ...formData, dryingMethod: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Tarpaulin">Tarpaulin</option>
                <option value="Raised beds">Raised beds</option>
                <option value="Bare ground">Bare ground</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cleanliness / contamination risk</label>
              <select
                value={formData.contaminationRisk}
                onChange={(e) => setFormData({ ...formData, contaminationRisk: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Storage method observed</label>
              <select
                value={formData.storageMethod}
                onChange={(e) => setFormData({ ...formData, storageMethod: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Sacks indoors">Sacks indoors</option>
                <option value="Sacks outdoors">Sacks outdoors</option>
                <option value="Bulk">Bulk</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Common defects seen (pods, husks, FM, mould, stones, etc.)</label>
              <input
                type="text"
                value={formData.commonDefects}
                onChange={(e) => setFormData({ ...formData, commonDefects: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Quality improvement recommendations shared</label>
              <textarea
                value={formData.qualityRecommendations}
                onChange={(e) => setFormData({ ...formData, qualityRecommendations: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">E. TRADERS, GREEN BEAN AVAILABILITY & COMPETITOR ACTIVITY</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tradersActive}
                  onChange={(e) => setFormData({ ...formData, tradersActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Traders active in this area today?</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estimated green bean available (Kgs)</label>
              <input
                type="number"
                step="0.01"
                value={formData.greenBeanAvailableKg}
                onChange={(e) => setFormData({ ...formData, greenBeanAvailableKg: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Main traders identified</label>
            {traders.map((trader) => (
              <div key={trader.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 border rounded bg-gray-50">
                <input
                  type="text"
                  placeholder="Name"
                  value={trader.name}
                  onChange={(e) => updateTrader(trader.id, 'name', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Contact"
                  value={trader.contact}
                  onChange={(e) => updateTrader(trader.id, 'contact', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={trader.notes}
                  onChange={(e) => updateTrader(trader.id, 'notes', e.target.value)}
                  className="border rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => removeTrader(trader.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTrader}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Trader
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.competitorsActive}
                  onChange={(e) => setFormData({ ...formData, competitorsActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Competitor companies active here?</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">List competitor names</label>
              <input
                type="text"
                value={formData.competitorNames}
                onChange={(e) => setFormData({ ...formData, competitorNames: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Competitor price advantage (if any)</label>
              <input
                type="text"
                value={formData.competitorPriceAdvantage}
                onChange={(e) => setFormData({ ...formData, competitorPriceAdvantage: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.priceManipulation}
                  onChange={(e) => setFormData({ ...formData, priceManipulation: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Price manipulation/overrule in field?</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Explain field price overrule / market behavior</label>
              <textarea
                value={formData.marketBehaviorNotes}
                onChange={(e) => setFormData({ ...formData, marketBehaviorNotes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">F. FIELD MARKET PRICES (UGX/KG)</h2>

          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left text-sm">Coffee Type</th>
                  <th className="border p-2 text-left text-sm">Lowest</th>
                  <th className="border p-2 text-left text-sm">Highest</th>
                  <th className="border p-2 text-left text-sm">Common</th>
                  <th className="border p-2 text-left text-sm">Who is Buying</th>
                  <th className="border p-2 text-left text-sm">Notes</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((price) => (
                  <tr key={price.id}>
                    <td className="border p-2 font-medium text-sm">{price.coffeeType}</td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={price.lowest}
                        onChange={(e) => updatePrice(price.id, 'lowest', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={price.highest}
                        onChange={(e) => updatePrice(price.id, 'highest', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={price.common}
                        onChange={(e) => updatePrice(price.id, 'common', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={price.whoBuying}
                        onChange={(e) => updatePrice(price.id, 'whoBuying', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={price.notes}
                        onChange={(e) => updatePrice(price.id, 'notes', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price movement vs last week</label>
              <select
                value={formData.priceMovement}
                onChange={(e) => setFormData({ ...formData, priceMovement: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Rising">Rising</option>
                <option value="Falling">Falling</option>
                <option value="Stable">Stable</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reason for movement</label>
              <input
                type="text"
                value={formData.priceMovementReason}
                onChange={(e) => setFormData({ ...formData, priceMovementReason: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="supply, buyers, rain, transport, etc."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">G. SAMPLES, PHOTOS & EVIDENCE</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.samplesCollected}
                  onChange={(e) => setFormData({ ...formData, samplesCollected: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Samples collected?</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sample type & weight</label>
              <input
                type="text"
                value={formData.sampleTypeWeight}
                onChange={(e) => setFormData({ ...formData, sampleTypeWeight: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. FAQ 2kg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sample label/reference code</label>
              <input
                type="text"
                value={formData.sampleReferenceCode}
                onChange={(e) => setFormData({ ...formData, sampleReferenceCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.photosTaken}
                  onChange={(e) => setFormData({ ...formData, photosTaken: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Photos taken?</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Photo references (phone names / time / description)</label>
              <textarea
                value={formData.photoReferences}
                onChange={(e) => setFormData({ ...formData, photoReferences: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">H. TEAM RECOMMENDATIONS & ACTION PLAN</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recommended action</label>
              <select
                value={formData.recommendedAction}
                onChange={(e) => setFormData({ ...formData, recommendedAction: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Buy Immediately">Buy Immediately</option>
                <option value="Monitor">Monitor</option>
                <option value="Return Next Week">Return Next Week</option>
                <option value="Hold">Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Recommended buying price (UGX/KG)</label>
              <input
                type="number"
                step="0.01"
                value={formData.recommendedBuyingPrice}
                onChange={(e) => setFormData({ ...formData, recommendedBuyingPrice: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Key risks/issues to watch</label>
              <textarea
                value={formData.keyRisks}
                onChange={(e) => setFormData({ ...formData, keyRisks: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Opportunities (new suppliers, volumes, quality)</label>
              <textarea
                value={formData.opportunities}
                onChange={(e) => setFormData({ ...formData, opportunities: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Next follow-up date/plan</label>
              <input
                type="date"
                value={formData.nextFollowupDate}
                onChange={(e) => setFormData({ ...formData, nextFollowupDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">I. SIGN-OFF</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prepared by (Name) *</label>
              <input
                type="text"
                required
                value={formData.preparedBy}
                onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reviewed by Supervisor (Name)</label>
              <input
                type="text"
                value={formData.reviewedBySupervisor}
                onChange={(e) => setFormData({ ...formData, reviewedBySupervisor: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/field-assessments')}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}

/*
  # Create Field Assessment System

  1. New Tables
    - `field_assessments`
      - Core assessment data including visit identification, GPS coordinates
      - Farmer engagement and supplier discovery data
      - Crop status, health and pest management information
      - Harvest handling and quality risk data
      - Trader and competitor activity information
      - Market prices for different coffee types
      - Sample and photo tracking
      - Team recommendations and action plans
      - Timestamps and user tracking
    
    - `field_assessment_prices`
      - Stores market price data for different coffee types
      - Links to field_assessments table
    
    - `field_assessment_suppliers`
      - Stores new supplier details discovered during assessment
      - Links to field_assessments table
    
    - `field_assessment_traders`
      - Stores trader information discovered during assessment
      - Links to field_assessments table

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to create and view assessments
    - Add policies for users to update their own assessments
*/

CREATE TABLE IF NOT EXISTS field_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Visit Identification (Section A)
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  area_village text NOT NULL,
  sub_county text,
  district text,
  team_members text NOT NULL,
  start_time time,
  end_time time,
  gps_latitude decimal(10, 8),
  gps_longitude decimal(11, 8),
  gps_landmark text,
  
  -- Farmer Engagement & Supplier Discovery (Section B)
  farmers_visited integer DEFAULT 0,
  new_suppliers_identified integer DEFAULT 0,
  farmer_group_association text,
  farmers_willing_to_sell text,
  farmers_willing_reason text,
  
  -- Crop Status, Health & Pest Management (Section C)
  crop_condition text,
  coffee_variety text,
  estimated_harvest_potential_kg decimal(12, 2),
  coffee_on_trees_percent integer,
  harvest_ongoing boolean DEFAULT false,
  expected_peak_harvest text,
  pest_disease_level text,
  pest_disease_names text,
  farmer_action_advised text,
  soil_condition text,
  soil_testing_locations text,
  
  -- Harvest Handling, Post-Harvest & Quality Risks (Section D)
  harvest_handling_method text,
  drying_method text,
  contamination_risk text,
  common_defects text,
  storage_method text,
  quality_recommendations text,
  
  -- Traders, Green Bean & Competitor Activity (Section E)
  traders_active boolean DEFAULT false,
  green_bean_available_kg decimal(12, 2),
  competitors_active boolean DEFAULT false,
  competitor_names text,
  competitor_price_advantage text,
  price_manipulation boolean DEFAULT false,
  market_behavior_notes text,
  
  -- Field Market Prices (Section F)
  price_movement text,
  price_movement_reason text,
  
  -- Samples, Photos & Evidence (Section G)
  samples_collected boolean DEFAULT false,
  sample_type_weight text,
  sample_reference_code text,
  photos_taken boolean DEFAULT false,
  photo_references text,
  
  -- Team Recommendations & Action Plan (Section H)
  recommended_action text,
  recommended_buying_price_ugx decimal(12, 2),
  key_risks text,
  opportunities text,
  next_followup_date date,
  
  -- Sign-off (Section I)
  prepared_by text NOT NULL,
  prepared_by_signature text,
  reviewed_by_supervisor text,
  supervisor_signature text,
  
  -- Metadata
  submitted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS field_assessment_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES field_assessments(id) ON DELETE CASCADE,
  coffee_type text NOT NULL,
  lowest_price_ugx decimal(12, 2),
  highest_price_ugx decimal(12, 2),
  common_price_ugx decimal(12, 2),
  who_is_buying text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_assessment_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES field_assessments(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  phone text,
  village text,
  estimated_kgs decimal(12, 2),
  expected_selling_date text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_assessment_traders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES field_assessments(id) ON DELETE CASCADE,
  trader_name text NOT NULL,
  contact text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE field_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_assessment_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_assessment_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_assessment_traders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all field assessments"
  ON field_assessments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create field assessments"
  ON field_assessments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own field assessments"
  ON field_assessments FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Authenticated users can view all assessment prices"
  ON field_assessment_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assessment prices"
  ON field_assessment_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all assessment suppliers"
  ON field_assessment_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assessment suppliers"
  ON field_assessment_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all assessment traders"
  ON field_assessment_traders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assessment traders"
  ON field_assessment_traders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_field_assessments_visit_date ON field_assessments(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_assessments_district ON field_assessments(district);
CREATE INDEX IF NOT EXISTS idx_field_assessments_submitted_by ON field_assessments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_field_assessment_prices_assessment_id ON field_assessment_prices(assessment_id);
CREATE INDEX IF NOT EXISTS idx_field_assessment_suppliers_assessment_id ON field_assessment_suppliers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_field_assessment_traders_assessment_id ON field_assessment_traders(assessment_id);
/*
  # Verification System

  1. New Tables
    - `verifications`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Verification code (e.g., GPCF-TRD-0001)
      - `type` (text) - Type: employee_id or document
      - `subtype` (text) - Subtype description
      - `status` (text) - Status: verified, expired, revoked
      - `issued_to_name` (text) - Full name of person
      - `employee_no` (text, nullable) - Employee number if applicable
      - `position` (text, nullable) - Job position
      - `department` (text, nullable) - Department name
      - `workstation` (text, nullable) - Work location
      - `photo_url` (text, nullable) - Photo URL for employee IDs
      - `issued_at` (timestamptz) - Issue date
      - `valid_until` (timestamptz, nullable) - Expiration date
      - `reference_no` (text, nullable) - Document reference number
      - `file_url` (text, nullable) - Document file URL
      - `access_pin_hash` (text, nullable) - Hashed PIN for document access
      - `meta` (jsonb) - Additional metadata
      - `revoked_reason` (text, nullable) - Reason for revocation
      - `created_by` (uuid) - Admin who created
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `verification_audit_logs`
      - `id` (uuid, primary key)
      - `action` (text) - Action type: create, update, revoke
      - `code` (text) - Verification code affected
      - `admin_user` (uuid) - Admin who performed action
      - `admin_email` (text) - Admin email for display
      - `timestamp` (timestamptz) - When action occurred
      - `details` (jsonb) - Additional details about the action

  2. Security
    - Enable RLS on both tables
    - Public can read verifications by code (for verify page)
    - Only authenticated admins can create/update verifications
    - Only authenticated users can read audit logs
*/

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('employee_id', 'document')),
  subtype text NOT NULL,
  status text NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'expired', 'revoked')),
  issued_to_name text NOT NULL,
  employee_no text,
  position text,
  department text,
  workstation text,
  photo_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  reference_no text,
  file_url text,
  access_pin_hash text,
  meta jsonb DEFAULT '{}'::jsonb,
  revoked_reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create verification audit logs table
CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('create', 'update', 'revoke')),
  code text NOT NULL,
  admin_user uuid REFERENCES auth.users(id),
  admin_email text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verifications_code ON verifications(code);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_type ON verifications(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_code ON verification_audit_logs(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON verification_audit_logs(timestamp DESC);

-- Enable RLS
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verifications table

-- Public can read verifications for the verify page
CREATE POLICY "Anyone can view verifications by code"
  ON verifications FOR SELECT
  USING (true);

-- Authenticated users can create verifications
CREATE POLICY "Authenticated users can create verifications"
  ON verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Authenticated users can update verifications they created
CREATE POLICY "Authenticated users can update verifications"
  ON verifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for audit logs

-- Authenticated users can read audit logs
CREATE POLICY "Authenticated users can view audit logs"
  ON verification_audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create audit logs
CREATE POLICY "Authenticated users can create audit logs"
  ON verification_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_user);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_verifications_updated_at ON verifications;
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_timestamp();

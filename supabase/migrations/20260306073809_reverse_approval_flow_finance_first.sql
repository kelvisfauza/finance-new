/*
  # Reverse Approval Flow - Finance Approves First, Admin Approves Last

  ## Changes Overview
  This migration reverses the approval workflow so that:
  1. Finance approves requests FIRST
  2. Admin approves requests LAST and triggers disbursement
  3. Money is only disbursed when admin gives final approval

  ## Detailed Changes
  
  1. New Columns
    - `approval_requests.finance_reviewed` (boolean) - Tracks if finance has reviewed
    - `approval_requests.finance_review_at` (timestamp) - When finance reviewed
    - `approval_requests.finance_review_by` (text) - Who in finance reviewed
    - `approval_requests.admin_final_approval` (boolean) - Final admin approval flag
    - `approval_requests.admin_final_approval_at` (timestamp) - When admin gave final approval
    - `approval_requests.admin_final_approval_by` (text) - Who gave final approval
    
  2. Status Flow Changes
    - New status: 'Pending Finance' - Initial state after creation
    - New status: 'Finance Approved' - After finance approves, waiting for admin
    - New status: 'Admin Approved' - Final approval, triggers disbursement
    - Existing statuses: 'Rejected', 'Pending'

  3. Modified Columns
    - Update default status to 'Pending Finance'
    - Keep existing approval tracking columns for backward compatibility

  4. Notes
    - Existing approval_requests rows will need manual review
    - Finance users will see 'Pending Finance' requests first
    - Admin users will see 'Finance Approved' requests awaiting final approval
    - Disbursement only happens when admin_final_approval is true
*/

-- Add new columns for the reversed approval flow
ALTER TABLE approval_requests 
  ADD COLUMN IF NOT EXISTS finance_reviewed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS finance_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_review_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_final_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_final_approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_final_approval_by TEXT;

-- Change default status to 'Pending Finance' for new requests
ALTER TABLE approval_requests 
  ALTER COLUMN status SET DEFAULT 'Pending Finance';

-- Also update money_requests table for consistency (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'money_requests'
  ) THEN
    ALTER TABLE money_requests 
      ADD COLUMN IF NOT EXISTS finance_reviewed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS finance_review_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS finance_review_by TEXT,
      ADD COLUMN IF NOT EXISTS admin_final_approval BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS admin_final_approval_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS admin_final_approval_by TEXT;
    
    ALTER TABLE money_requests 
      ALTER COLUMN status SET DEFAULT 'Pending Finance';
  END IF;
END $$;

-- Add comments explaining the new workflow
COMMENT ON COLUMN approval_requests.finance_reviewed IS 'First approval stage - finance reviews the request';
COMMENT ON COLUMN approval_requests.finance_review_at IS 'Timestamp when finance reviewed';
COMMENT ON COLUMN approval_requests.finance_review_by IS 'Name/email of finance person who reviewed';
COMMENT ON COLUMN approval_requests.admin_final_approval IS 'Final approval stage - admin approves and triggers disbursement';
COMMENT ON COLUMN approval_requests.admin_final_approval_at IS 'Timestamp when admin gave final approval';
COMMENT ON COLUMN approval_requests.admin_final_approval_by IS 'Name/email of admin who gave final approval';

-- Create index for better query performance on new columns
CREATE INDEX IF NOT EXISTS idx_approval_requests_finance_reviewed 
  ON approval_requests(finance_reviewed) 
  WHERE finance_reviewed = false;

CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_final_approval 
  ON approval_requests(admin_final_approval, finance_reviewed) 
  WHERE admin_final_approval = false AND finance_reviewed = true;

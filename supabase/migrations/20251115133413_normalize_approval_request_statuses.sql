/*
  # Normalize Approval Request Statuses

  1. Changes
    - Update existing requests to have consistent status values
    - Normalize finance_approved and admin_approved flags
    - Set default status for new requests to 'Pending Finance'
  
  2. Status Flow
    - New request: status = 'Pending Finance', finance_approved = false, admin_approved = false
    - After Finance approves: status = 'Pending Admin Approval', finance_approved = true, admin_approved = false  
    - After Admin approves: status = 'Approved', finance_approved = true, admin_approved = true
    - If rejected: status = 'Rejected'
  
  3. Data Cleanup
    - Normalize existing approved requests
    - Fix inconsistent finance_approved/admin_approved flags
    - Standardize status values
*/

-- Update requests where status is 'Approved' but flags are inconsistent
UPDATE approval_requests
SET 
  finance_approved = true,
  admin_approved = true
WHERE status = 'Approved'
  AND (finance_approved IS NULL OR finance_approved = false OR admin_approved IS NULL OR admin_approved = false);

-- Update requests with 'Finance Approved' status to 'Pending Admin Approval'
UPDATE approval_requests
SET 
  status = 'Pending Admin Approval',
  finance_approved = true,
  admin_approved = COALESCE(admin_approved, false)
WHERE status = 'Finance Approved';

-- Update requests with 'Admin Approved' status to 'Approved'
UPDATE approval_requests
SET 
  status = 'Approved',
  finance_approved = COALESCE(finance_approved, true),
  admin_approved = true
WHERE status = 'Admin Approved';

-- Normalize 'Pending' status to 'Pending Finance' if no approvals yet
UPDATE approval_requests
SET 
  status = 'Pending Finance',
  finance_approved = COALESCE(finance_approved, false),
  admin_approved = COALESCE(admin_approved, false)
WHERE status IN ('Pending', 'Processing')
  AND (finance_approved IS NULL OR finance_approved = false);

-- Update 'Pending' status to 'Pending Admin Approval' if finance approved but admin hasn't
UPDATE approval_requests
SET 
  status = 'Pending Admin Approval',
  admin_approved = COALESCE(admin_approved, false)
WHERE status IN ('Pending', 'Processing')
  AND finance_approved = true
  AND (admin_approved IS NULL OR admin_approved = false);

-- Ensure all NULL boolean values are set to false for pending requests
UPDATE approval_requests
SET 
  finance_approved = COALESCE(finance_approved, false),
  admin_approved = COALESCE(admin_approved, false)
WHERE status IN ('Pending Finance', 'Pending Admin Approval', 'Pending', 'Processing');

-- Set default for future inserts
ALTER TABLE approval_requests 
  ALTER COLUMN status SET DEFAULT 'Pending Finance',
  ALTER COLUMN finance_approved SET DEFAULT false,
  ALTER COLUMN admin_approved SET DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_finance_pending 
  ON approval_requests(finance_approved, status) 
  WHERE finance_approved = false;

CREATE INDEX IF NOT EXISTS idx_approval_requests_admin_pending 
  ON approval_requests(finance_approved, admin_approved, status) 
  WHERE finance_approved = true AND admin_approved = false;
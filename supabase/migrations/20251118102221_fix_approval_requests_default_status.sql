/*
  # Fix Default Status for Approval Requests

  ## Problem
  The `status` column in `approval_requests` table has a default value of 'Pending Finance',
  which causes new requests to skip the Admin approval stage and appear as already approved.

  ## Changes
  - Change default status from 'Pending Finance' to 'Pending Admin'
  - This ensures all new requests start at the Admin approval stage

  ## Impact
  - New requests will now correctly require Admin approval before Finance approval
  - Existing requests are not affected
*/

-- Change the default status to 'Pending Admin' so requests start at the correct stage
ALTER TABLE approval_requests 
ALTER COLUMN status SET DEFAULT 'Pending Admin';

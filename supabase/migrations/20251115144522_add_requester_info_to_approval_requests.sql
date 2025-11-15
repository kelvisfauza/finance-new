/*
  # Add Requester Information to Approval Requests

  1. Changes
    - Add requestedby_name column to store the requester's full name
    - Add requestedby_position column to store the requester's position
    - Populate existing rows with data from employees table
  
  2. Purpose
    - Improve performance by avoiding joins with employees table
    - Display proper names and positions instead of email addresses
    - Maintain data consistency even if employee records change
  
  3. Notes
    - Existing rows will be backfilled based on requestedby email
    - Future inserts should populate these fields at creation time
*/

-- Add new columns to approval_requests
ALTER TABLE approval_requests 
  ADD COLUMN IF NOT EXISTS requestedby_name TEXT,
  ADD COLUMN IF NOT EXISTS requestedby_position TEXT;

-- Backfill existing data from employees table
UPDATE approval_requests ar
SET 
  requestedby_name = e.name,
  requestedby_position = e.position
FROM employees e
WHERE ar.requestedby = e.email
  AND (ar.requestedby_name IS NULL OR ar.requestedby_position IS NULL);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_requestedby 
  ON approval_requests(requestedby);

-- Add comment explaining the columns
COMMENT ON COLUMN approval_requests.requestedby_name IS 'Full name of the person who created the request';
COMMENT ON COLUMN approval_requests.requestedby_position IS 'Position/title of the person who created the request';

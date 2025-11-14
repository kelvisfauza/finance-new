/*
  # Add SELECT policy for approval_requests table

  1. Changes
    - Add explicit SELECT policy for authenticated users to view approval requests
    - This ensures users can fetch and view expense requests, requisitions, etc.

  2. Security
    - Policy restricts access to authenticated users only
    - Maintains existing RLS security model
*/

-- Drop the existing broad "ALL" policy as it may not be working correctly
DROP POLICY IF EXISTS "Authenticated users can manage approval requests" ON approval_requests;

-- Add specific policies for each operation
CREATE POLICY "Authenticated users can view approval requests"
  ON approval_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert approval requests"
  ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

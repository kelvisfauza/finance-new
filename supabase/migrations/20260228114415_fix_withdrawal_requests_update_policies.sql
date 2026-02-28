/*
  # Fix Withdrawal Requests UPDATE Policies

  1. Problem
    - UPDATE policies have no WITH CHECK clause
    - This prevents updates from succeeding even when USING clause passes
    - "Admins can update" policy with qual=true is overly permissive

  2. Changes
    - Drop existing problematic UPDATE policies
    - Recreate with proper USING and WITH CHECK clauses
    - Ensure Finance and Admin users can update withdrawal requests

  3. Security
    - Only Finance and Admin users can update withdrawal requests
    - WITH CHECK ensures updates are properly validated
*/

-- Drop existing problematic UPDATE policies
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Finance can update withdrawal requests" ON withdrawal_requests;

-- Create proper UPDATE policy for Finance and Admin users
CREATE POLICY "Finance and Admin can update withdrawal requests"
  ON withdrawal_requests
  FOR UPDATE
  TO public
  USING (user_has_permission('Finance') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Finance') OR is_current_user_admin());

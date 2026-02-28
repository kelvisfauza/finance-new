/*
  # Fix Withdrawal Requests RLS for Finance Users

  1. Problem
    - Finance Manager users like Mukobi Godwin cannot see withdrawal requests
    - Current policy checks for exact 'Finance' permission but users have 'Finance:view', 'Finance:approve' etc.
    - is_current_user_admin() only checks for 'Administrator', 'Super Admin', 'Manager' roles
    - Finance Manager role is not recognized as admin

  2. Changes
    - Update SELECT policy to check for Finance:view permission instead of just 'Finance'
    - Update UPDATE policy to check for Finance:approve permission
    - Keep is_current_user_admin() as fallback for actual admins

  3. Security
    - Only users with Finance:view permission or admins can view withdrawal requests
    - Only users with Finance:approve permission or admins can update withdrawal requests
    - Users can still view their own requests
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Finance and Admin can update withdrawal requests" ON withdrawal_requests;

-- Create new SELECT policy with proper Finance permission check
CREATE POLICY "Users view own withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  TO public
  USING (
    user_id = auth.uid()::text 
    OR user_has_permission('Finance:view')
    OR user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

-- Create new UPDATE policy with proper Finance permission check
CREATE POLICY "Finance and Admin can update withdrawal requests"
  ON withdrawal_requests
  FOR UPDATE
  TO public
  USING (
    user_has_permission('Finance:approve')
    OR user_has_permission('Finance:process')
    OR is_current_user_admin()
  )
  WITH CHECK (
    user_has_permission('Finance:approve')
    OR user_has_permission('Finance:process')
    OR is_current_user_admin()
  );

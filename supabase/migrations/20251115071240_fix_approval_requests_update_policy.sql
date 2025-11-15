/*
  # Fix approval_requests UPDATE policy to avoid users table access

  1. Changes
    - Drop the existing UPDATE policy that queries auth.users table
    - Create new UPDATE policy that uses employees.auth_user_id instead
    - This avoids permission denied errors when trying to access auth.users
  
  2. Security
    - Maintains same security level: only Finance and Admin roles can update
    - Uses auth_user_id column to match current user with employee record
*/

-- Drop the old policy that queries auth.users
DROP POLICY IF EXISTS "Finance and Admin can update approval requests" ON approval_requests;

-- Create new policy using auth_user_id
CREATE POLICY "Finance and Admin can update approval requests"
  ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM employees 
      WHERE employees.auth_user_id = auth.uid()
        AND employees.status = 'Active'
        AND (
          employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin', 'Manager')
          OR employees.permissions && ARRAY['Finance', 'Finance Management', 'Finance Approval', 'Administration']
          OR EXISTS (
            SELECT 1 
            FROM unnest(employees.permissions) AS perm 
            WHERE perm LIKE 'Finance%' OR perm = 'Administration'
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM employees 
      WHERE employees.auth_user_id = auth.uid()
        AND employees.status = 'Active'
        AND (
          employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin', 'Manager')
          OR employees.permissions && ARRAY['Finance', 'Finance Management', 'Finance Approval', 'Administration']
          OR EXISTS (
            SELECT 1 
            FROM unnest(employees.permissions) AS perm 
            WHERE perm LIKE 'Finance%' OR perm = 'Administration'
          )
        )
    )
  );

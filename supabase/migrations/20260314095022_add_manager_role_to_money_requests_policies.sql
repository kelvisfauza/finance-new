/*
  # Add Manager Role to Money Requests Policies

  1. Security Changes
    - Update existing money_requests SELECT policy to include Manager role
    - Update existing money_requests UPDATE policy to include Manager role
    - This allows Godwin (Manager) to access withdrawal requests for finance approval
    
  2. Notes
    - Manager role needs access to withdrawal_requests view which inherits from money_requests
    - Maintains existing security for Finance Manager, Finance, Administrator, Super Admin
*/

-- Drop and recreate the SELECT policy with Manager role included
DROP POLICY IF EXISTS "Finance and Admin can view money requests" ON money_requests;
CREATE POLICY "Finance and Admin can view money requests"
  ON money_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Finance Manager', 'Finance', 'Manager', 'Administrator', 'Super Admin')
      AND employees.status = 'Active'
    )
  );

-- Drop and recreate the UPDATE policy with Manager role included
DROP POLICY IF EXISTS "Finance and Admin can update money requests" ON money_requests;
CREATE POLICY "Finance and Admin can update money requests"
  ON money_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Finance Manager', 'Finance', 'Manager', 'Administrator', 'Super Admin')
      AND employees.status = 'Active'
    )
  );

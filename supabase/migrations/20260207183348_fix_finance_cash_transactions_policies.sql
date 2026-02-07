/*
  # Fix finance_cash_transactions RLS Policy Issues

  1. Changes
    - Drop the overly broad "ALL" policy that may be causing conflicts
    - Replace with specific policies for each operation
    - Ensure policies work correctly with proper USING and WITH CHECK clauses

  2. Security
    - Maintain finance user and admin access through specific policies
    - Ensure authenticated users can perform necessary operations
*/

-- Drop the problematic ALL policy
DROP POLICY IF EXISTS "Finance can manage cash transactions" ON finance_cash_transactions;

-- Create specific policies for each operation
CREATE POLICY "Finance can view cash transactions"
  ON finance_cash_transactions
  FOR SELECT
  TO public
  USING (
    user_has_permission('Finance'::text) 
    OR user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can insert cash transactions"
  ON finance_cash_transactions
  FOR INSERT
  TO public
  WITH CHECK (
    user_has_permission('Finance'::text) 
    OR user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can update cash transactions"
  ON finance_cash_transactions
  FOR UPDATE
  TO public
  USING (
    user_has_permission('Finance'::text) 
    OR user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  )
  WITH CHECK (
    user_has_permission('Finance'::text) 
    OR user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can delete cash transactions"
  ON finance_cash_transactions
  FOR DELETE
  TO public
  USING (
    user_has_permission('Finance'::text) 
    OR user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

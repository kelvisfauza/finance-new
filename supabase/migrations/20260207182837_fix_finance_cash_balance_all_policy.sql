/*
  # Fix finance_cash_balance RLS Policy Issues

  1. Changes
    - Drop the overly broad "ALL" admin policy that may be causing conflicts
    - Replace with specific admin policies for each operation
    - Ensure policies work correctly with WHERE clauses

  2. Security
    - Maintain admin access through specific policies
    - Ensure authenticated users can perform necessary operations
*/

-- Drop the problematic ALL policy
DROP POLICY IF EXISTS "Admins can manage finance_cash_balance" ON finance_cash_balance;

-- Create specific admin policies
CREATE POLICY "Admins can view cash balance"
  ON finance_cash_balance
  FOR SELECT
  TO public
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert cash balance"
  ON finance_cash_balance
  FOR INSERT
  TO public
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update cash balance"
  ON finance_cash_balance
  FOR UPDATE
  TO public
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete cash balance"
  ON finance_cash_balance
  FOR DELETE
  TO public
  USING (is_current_user_admin());

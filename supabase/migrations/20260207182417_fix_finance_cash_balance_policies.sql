/*
  # Fix finance_cash_balance RLS Policies

  1. Changes
    - Drop existing overly permissive policies
    - Create new policies specifically for authenticated users
    - Ensure UPDATE policy works correctly with WHERE clauses

  2. Security
    - Restrict access to authenticated users only
    - Allow all authenticated users to view, insert, and update balance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create finance_cash_balance" ON finance_cash_balance;
DROP POLICY IF EXISTS "Authenticated users can update finance_cash_balance" ON finance_cash_balance;
DROP POLICY IF EXISTS "Anyone can view finance_cash_balance" ON finance_cash_balance;

-- Create SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view cash balance"
  ON finance_cash_balance
  FOR SELECT
  TO authenticated
  USING (true);

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create cash balance"
  ON finance_cash_balance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update cash balance"
  ON finance_cash_balance
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

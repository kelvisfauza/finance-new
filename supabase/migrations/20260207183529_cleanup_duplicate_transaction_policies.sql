/*
  # Cleanup duplicate finance_cash_transactions policies

  1. Changes
    - Remove duplicate INSERT and UPDATE policies on finance_cash_transactions
    - Keep the more specific policies

  2. Security
    - No change in access control - just removing duplicate policies
*/

-- Drop the less specific duplicate policies
DROP POLICY IF EXISTS "Finance users can insert cash transactions" ON finance_cash_transactions;
DROP POLICY IF EXISTS "Finance users can update cash transactions" ON finance_cash_transactions;

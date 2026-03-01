/*
  # Add Unique Constraint on finance_cash_transactions.reference

  1. Problem
    - Multiple HR payment approvals can create duplicate cash transactions
    - No database-level protection against duplicate reference values
    - This leads to inconsistent financial records

  2. Solution
    - Add UNIQUE constraint on reference column
    - This prevents duplicate transactions at database level
    - Provides clear error when duplicate attempted

  3. Security
    - Maintains data integrity
    - Prevents financial discrepancies
*/

-- First, clean up any existing duplicates (keep the earliest one)
DELETE FROM finance_cash_transactions
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY reference ORDER BY created_at ASC) as rn
    FROM finance_cash_transactions
    WHERE reference IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Add unique constraint on reference column
ALTER TABLE finance_cash_transactions 
ADD CONSTRAINT finance_cash_transactions_reference_key UNIQUE (reference);

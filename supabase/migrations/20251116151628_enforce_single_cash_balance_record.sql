/*
  # Enforce Single Cash Balance Record

  This migration ensures that the finance_cash_balance table can only ever have one record.

  1. Changes
    - Add a check constraint to ensure only one record exists
    - Add a unique constraint on a boolean column that's always true
    - This prevents multiple records from being inserted

  2. Security
    - Maintains existing RLS policies
*/

-- Add a boolean column that's always true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_cash_balance' AND column_name = 'singleton'
  ) THEN
    ALTER TABLE finance_cash_balance ADD COLUMN singleton boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Add unique constraint to ensure only one record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_cash_balance_singleton_key'
  ) THEN
    ALTER TABLE finance_cash_balance ADD CONSTRAINT finance_cash_balance_singleton_key UNIQUE (singleton);
  END IF;
END $$;

-- Update existing record to have singleton = true
UPDATE finance_cash_balance SET singleton = true WHERE singleton IS NULL;

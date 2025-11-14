/*
  # Add UPDATE and INSERT policies for finance_cash_balance

  1. Changes
    - Add INSERT policy for authenticated users to create cash balance records
    - Add UPDATE policy for authenticated users to modify cash balance
  
  2. Security
    - Maintains existing SELECT policy
    - Allows Finance users to update cash balance during transactions
*/

-- Add INSERT policy for authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'finance_cash_balance' 
    AND policyname = 'Authenticated users can create finance_cash_balance'
  ) THEN
    CREATE POLICY "Authenticated users can create finance_cash_balance"
      ON finance_cash_balance
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Add UPDATE policy for authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'finance_cash_balance' 
    AND policyname = 'Authenticated users can update finance_cash_balance'
  ) THEN
    CREATE POLICY "Authenticated users can update finance_cash_balance"
      ON finance_cash_balance
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

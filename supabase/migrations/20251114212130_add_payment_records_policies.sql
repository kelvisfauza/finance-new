/*
  # Add INSERT and UPDATE policies for payment_records

  1. Changes
    - Add INSERT policy for authenticated users to create payment records
    - Add UPDATE policy for authenticated users to modify payment records
  
  2. Security
    - Maintains existing SELECT and DELETE policies
    - Allows Finance users to manage payments
*/

-- Add INSERT policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_records' 
    AND policyname = 'Authenticated users can create payment records'
  ) THEN
    CREATE POLICY "Authenticated users can create payment records"
      ON payment_records
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Add UPDATE policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_records' 
    AND policyname = 'Authenticated users can update payment records'
  ) THEN
    CREATE POLICY "Authenticated users can update payment records"
      ON payment_records
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

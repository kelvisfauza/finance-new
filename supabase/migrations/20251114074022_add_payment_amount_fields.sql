/*
  # Add payment amount tracking fields

  1. Changes
    - Add `amount_paid` column to track the actual amount paid
    - Add `balance` column to track remaining balance
    
  2. Notes
    - These fields support partial payment tracking
    - Default values set to 0 for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_records' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE payment_records ADD COLUMN amount_paid numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_records' AND column_name = 'balance'
  ) THEN
    ALTER TABLE payment_records ADD COLUMN balance numeric DEFAULT 0;
  END IF;
END $$;
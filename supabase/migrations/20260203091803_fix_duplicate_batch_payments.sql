/*
  # Fix Duplicate Batch Payments

  1. Problem
    - Multiple payments exist for the same batch reference
    - This causes overpayment to suppliers and incorrect cash balances
    
  2. Changes
    - Mark duplicate payments (keep earliest, mark rest as duplicates)
    - Add unique constraint to prevent future duplicates
    
  3. Security
    - No RLS changes needed
    
  4. Important Notes
    - Duplicate payments will be marked but not deleted (for audit trail)
    - Only the earliest payment for each batch is kept as valid
    - A unique index will prevent future duplicates
*/

-- Step 1: Add a column to track if a payment is a duplicate (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_payments' AND column_name = 'is_duplicate'
  ) THEN
    ALTER TABLE supplier_payments ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 2: Mark duplicate payments
-- For each reference, keep the FIRST payment (earliest created_at) and mark others as duplicates
WITH ranked_payments AS (
  SELECT 
    id,
    reference,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY reference ORDER BY created_at ASC) as row_num
  FROM supplier_payments
  WHERE reference IS NOT NULL 
    AND reference != ''
)
UPDATE supplier_payments sp
SET is_duplicate = TRUE
FROM ranked_payments rp
WHERE sp.id = rp.id 
  AND rp.row_num > 1;

-- Step 3: Log the duplicates that were found
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM supplier_payments
  WHERE is_duplicate = TRUE;
  
  RAISE NOTICE 'Marked % duplicate payments', duplicate_count;
END $$;

-- Step 4: Create a unique partial index that only applies to non-duplicate, non-null references
-- This allows duplicates to remain in the table for audit but prevents new ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_payments_reference_unique 
  ON supplier_payments(reference) 
  WHERE reference IS NOT NULL 
    AND reference != '' 
    AND (is_duplicate IS NULL OR is_duplicate = FALSE);

-- Step 5: Create a unique partial index on lot_id to prevent paying the same lot twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_payments_lot_id_unique 
  ON supplier_payments(lot_id) 
  WHERE lot_id IS NOT NULL 
    AND (is_duplicate IS NULL OR is_duplicate = FALSE);

-- Step 6: Add comment explaining the duplicate column
COMMENT ON COLUMN supplier_payments.is_duplicate IS 'Marks duplicate payments that were accidentally created. Only the earliest payment for each batch is valid.';

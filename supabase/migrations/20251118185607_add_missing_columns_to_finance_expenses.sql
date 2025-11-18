/*
  # Add missing columns to finance_expenses table

  1. Changes
    - Add `department` column to track which department the expense is for
    - Add `approval_request_id` column to link expenses to approval requests
    
  2. Notes
    - Both columns are nullable since existing records won't have these values
    - approval_request_id references the approval_requests table
*/

-- Add department column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_expenses' AND column_name = 'department'
  ) THEN
    ALTER TABLE finance_expenses ADD COLUMN department text;
  END IF;
END $$;

-- Add approval_request_id column with foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_expenses' AND column_name = 'approval_request_id'
  ) THEN
    ALTER TABLE finance_expenses ADD COLUMN approval_request_id uuid REFERENCES approval_requests(id) ON DELETE SET NULL;
  END IF;
END $$;
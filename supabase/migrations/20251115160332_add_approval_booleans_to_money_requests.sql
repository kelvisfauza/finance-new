/*
  # Add approval boolean fields to money_requests
  
  1. Changes
    - Add `admin_approved` boolean field (default false)
    - Add `finance_approved` boolean field (default false)
  
  2. Purpose
    - Align money_requests with approval_requests flow
    - Support admin-first, then finance approval workflow for HR payments
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'money_requests' AND column_name = 'admin_approved'
  ) THEN
    ALTER TABLE money_requests ADD COLUMN admin_approved boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'money_requests' AND column_name = 'finance_approved'
  ) THEN
    ALTER TABLE money_requests ADD COLUMN finance_approved boolean DEFAULT false;
  END IF;
END $$;
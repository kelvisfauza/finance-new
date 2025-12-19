/*
  # Make supplier_payments.lot_id nullable

  1. Changes
    - Alter `supplier_payments` table to make `lot_id` column nullable
    - This allows payments to be created without requiring a finance_coffee_lot reference
    - Supports payment records that may reference other sources (like payment_records table)
  
  2. Reasoning
    - Payment records can come from different sources, not just finance_coffee_lots
    - The reference field already provides batch number tracking
    - Making this nullable provides more flexibility in the payment system
*/

ALTER TABLE supplier_payments 
ALTER COLUMN lot_id DROP NOT NULL;
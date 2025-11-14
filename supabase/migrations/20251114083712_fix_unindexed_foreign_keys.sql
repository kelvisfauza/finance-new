/*
  # Fix Unindexed Foreign Keys

  1. Performance Improvements
    - Add indexes on all foreign key columns that lack covering indexes
    - This improves JOIN performance and foreign key constraint checking
    
  2. Tables Affected
    - advance_recoveries (advance_id, payment_id)
    - contract_approvals (contract_id)
    - conversations (created_by)
    - eudr_sales (batch_id, document_id)
    - finance_payments (approved_by)
    - finance_prices (created_by)
    - milling_cash_transactions (customer_id)
    - milling_transactions (customer_id)
    - money_requests (user_id)
    - rejected_coffee (farmer_id)
    - store_records (inventory_item_id)
    - supplier_payments (lot_id)
    - user_activity (user_id)
*/

-- Add indexes for advance_recoveries foreign keys
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_advance_id 
  ON advance_recoveries(advance_id);

CREATE INDEX IF NOT EXISTS idx_advance_recoveries_payment_id 
  ON advance_recoveries(payment_id);

-- Add index for contract_approvals foreign key
CREATE INDEX IF NOT EXISTS idx_contract_approvals_contract_id 
  ON contract_approvals(contract_id);

-- Add index for conversations foreign key
CREATE INDEX IF NOT EXISTS idx_conversations_created_by 
  ON conversations(created_by);

-- Add indexes for eudr_sales foreign keys
CREATE INDEX IF NOT EXISTS idx_eudr_sales_batch_id 
  ON eudr_sales(batch_id);

CREATE INDEX IF NOT EXISTS idx_eudr_sales_document_id 
  ON eudr_sales(document_id);

-- Add index for finance_payments foreign key
CREATE INDEX IF NOT EXISTS idx_finance_payments_approved_by 
  ON finance_payments(approved_by);

-- Add index for finance_prices foreign key
CREATE INDEX IF NOT EXISTS idx_finance_prices_created_by 
  ON finance_prices(created_by);

-- Add index for milling_cash_transactions foreign key
CREATE INDEX IF NOT EXISTS idx_milling_cash_transactions_customer_id 
  ON milling_cash_transactions(customer_id);

-- Add index for milling_transactions foreign key
CREATE INDEX IF NOT EXISTS idx_milling_transactions_customer_id 
  ON milling_transactions(customer_id);

-- Add index for money_requests foreign key
CREATE INDEX IF NOT EXISTS idx_money_requests_user_id 
  ON money_requests(user_id);

-- Add index for rejected_coffee foreign key
CREATE INDEX IF NOT EXISTS idx_rejected_coffee_farmer_id 
  ON rejected_coffee(farmer_id);

-- Add index for store_records foreign key
CREATE INDEX IF NOT EXISTS idx_store_records_inventory_item_id 
  ON store_records(inventory_item_id);

-- Add index for supplier_payments foreign key
CREATE INDEX IF NOT EXISTS idx_supplier_payments_lot_id 
  ON supplier_payments(lot_id);

-- Add index for user_activity foreign key
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id 
  ON user_activity(user_id);

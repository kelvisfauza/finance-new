/*
  # Drop Unused Indexes

  1. Performance Improvements
    - Remove indexes that are not being used by queries
    - Reduces write overhead and storage space
    - Improves INSERT, UPDATE, and DELETE performance
    
  2. Indexes to Drop
    - Various unused indexes across multiple tables
    - These have been identified as not used by the query planner
*/

-- Drop unused indexes on employees table
DROP INDEX IF EXISTS idx_employees_status;
DROP INDEX IF EXISTS idx_employees_disabled;
DROP INDEX IF EXISTS idx_employees_bypass_sms;

-- Drop unused indexes on supplier_advances table
DROP INDEX IF EXISTS idx_supplier_advances_is_closed;

-- Drop unused indexes on sales_transactions table
DROP INDEX IF EXISTS idx_sales_transactions_status;

-- Drop unused indexes on finance_transactions table
DROP INDEX IF EXISTS idx_finance_transactions_type;

-- Drop unused indexes on messages table
DROP INDEX IF EXISTS idx_messages_reply_to_id;

-- Drop unused indexes on daily_tasks table
DROP INDEX IF EXISTS idx_daily_tasks_type;
DROP INDEX IF EXISTS idx_daily_tasks_completed_by;

-- Drop unused indexes on purchase_orders table
DROP INDEX IF EXISTS idx_purchase_orders_status;

-- Drop unused indexes on audit_logs table
DROP INDEX IF EXISTS idx_audit_logs_table_name;
DROP INDEX IF EXISTS idx_audit_logs_performed_by;

-- Drop unused indexes on field_collections table
DROP INDEX IF EXISTS idx_field_collections_agent;

-- Drop unused indexes on market_data table
DROP INDEX IF EXISTS idx_market_data_type;

-- Drop unused indexes on user_presence table
DROP INDEX IF EXISTS idx_user_presence_status;

-- Drop unused indexes on price_data table
DROP INDEX IF EXISTS idx_price_data_type_date;

-- Drop unused indexes on calls table
DROP INDEX IF EXISTS idx_calls_recipient_status;
DROP INDEX IF EXISTS idx_calls_caller_status;

-- Drop unused indexes on workflow_steps table
DROP INDEX IF EXISTS idx_workflow_steps_payment_id;

-- Drop unused indexes on modification_requests table
DROP INDEX IF EXISTS idx_modification_requests_original_payment_id;
DROP INDEX IF EXISTS idx_modification_requests_target_department;
DROP INDEX IF EXISTS idx_modification_requests_status;

-- Drop unused indexes on overtime_awards table
DROP INDEX IF EXISTS idx_overtime_awards_employee;

-- Drop unused indexes on login_tokens table
DROP INDEX IF EXISTS idx_login_tokens_token;
DROP INDEX IF EXISTS idx_login_tokens_expires;

-- Drop unused indexes on archived tables
DROP INDEX IF EXISTS idx_archived_approval_requests_period;
DROP INDEX IF EXISTS idx_archived_cash_transactions_period;
DROP INDEX IF EXISTS idx_archived_payment_records_period;
DROP INDEX IF EXISTS idx_archived_money_requests_period;
DROP INDEX IF EXISTS idx_archive_history_period;

-- Drop unused indexes on cash_movements table
DROP INDEX IF EXISTS idx_cash_movements_session_date;

-- Drop unused indexes on receipts table
DROP INDEX IF EXISTS idx_receipts_doc_type_id;

-- Drop unused indexes on sms_failures table
DROP INDEX IF EXISTS idx_sms_failures_created_at;

-- Drop unused indexes on risk_assessments table
DROP INDEX IF EXISTS idx_risk_assessments_user_id;

-- Drop unused indexes on contract_files table
DROP INDEX IF EXISTS idx_contract_files_status;

-- Drop unused indexes on sms_logs table
DROP INDEX IF EXISTS idx_sms_logs_status;
DROP INDEX IF EXISTS idx_sms_logs_recipient_phone;

-- Drop unused indexes on finance_coffee_lots table
DROP INDEX IF EXISTS idx_finance_coffee_lots_status;
DROP INDEX IF EXISTS idx_finance_coffee_lots_coffee_record;

-- Drop unused indexes on inventory_movements table
DROP INDEX IF EXISTS idx_inventory_movements_coffee_record_id;
DROP INDEX IF EXISTS idx_inventory_movements_reference;

-- Drop unused indexes on sales_inventory_tracking table
DROP INDEX IF EXISTS idx_sales_inventory_coffee_record;
DROP INDEX IF EXISTS idx_sales_inventory_batch;
DROP INDEX IF EXISTS idx_sales_inventory_sale_id;

-- Drop unused indexes on farmer_profiles table
DROP INDEX IF EXISTS idx_farmer_profiles_phone;
DROP INDEX IF EXISTS idx_farmer_profiles_village;

-- Drop unused indexes on field_purchases table
DROP INDEX IF EXISTS idx_field_purchases_farmer;

-- Drop unused indexes on weekly_reports table
DROP INDEX IF EXISTS idx_weekly_reports_dates;

-- Drop unused indexes on facilitation_requests table
DROP INDEX IF EXISTS idx_facilitation_requests_status;

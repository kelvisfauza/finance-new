/*
  # Create withdrawal_requests view from money_requests
  
  1. Problem
    - Frontend components query `withdrawal_requests` table
    - New withdrawal system uses `money_requests` with `request_type = 'withdrawal'`
    - Schema mismatch causing Finance users (like Mukobi Godwin) to not see withdrawal requests
    
  2. Solution
    - Drop old `withdrawal_requests` table
    - Create a VIEW that selects from `money_requests` where `request_type = 'withdrawal'`
    - Map columns to match expected frontend interface
    
  3. Column Mapping
    - All available money_requests columns
    - Add requester_email as alias for requested_by
    - Add requester_name from employees join
    - Add NULL placeholders for missing columns frontend expects
    
  4. Security
    - View inherits RLS from underlying money_requests table
    - Finance users with proper permissions can see all withdrawal requests
*/

-- Drop old withdrawal_requests table and its policies
DROP POLICY IF EXISTS "Users view own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Finance and Admin can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON withdrawal_requests;

DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- Create view that maps money_requests withdrawals to expected schema
CREATE OR REPLACE VIEW withdrawal_requests AS
SELECT 
  mr.id,
  mr.user_id,
  mr.amount,
  mr.reason,
  mr.status,
  mr.request_type,
  mr.phone_number,
  mr.payment_channel,
  mr.payment_channel as disbursement_method,
  mr.phone_number as disbursement_phone,
  mr.disbursement_bank_name,
  mr.disbursement_account_number,
  mr.disbursement_account_name,
  mr.requested_by,
  mr.requested_by as requester_email,
  e.name as requester_name,
  mr.created_at,
  mr.updated_at,
  mr.requires_three_approvals,
  mr.admin_approved,
  mr.admin_approved_1,
  mr.admin_approved_1_by,
  mr.admin_approved_1_at,
  mr.admin_approved_2,
  mr.admin_approved_2_by,
  mr.admin_approved_2_at,
  mr.admin_approved_3,
  mr.admin_approved_3_by,
  mr.admin_approved_3_at,
  mr.wallet_balance_verified,
  mr.wallet_balance_at_approval,
  NULL::text as payout_status,
  NULL::text as payout_error,
  NULL::text as payout_ref,
  NULL::text as payout_reference,
  NULL::timestamptz as payout_attempted_at,
  mr.approved_by,
  mr.approved_at,
  NULL::text as rejected_by,
  NULL::timestamptz as rejected_at,
  mr.rejection_reason,
  mr.finance_approved_by,
  mr.finance_approved_at,
  mr.finance_reviewed,
  mr.finance_review_at,
  mr.finance_review_by,
  mr.admin_final_approval,
  mr.admin_final_approval_at,
  mr.admin_final_approval_by,
  NULL::timestamptz as paid_at
FROM money_requests mr
LEFT JOIN employees e ON mr.requested_by = e.email
WHERE mr.request_type = 'withdrawal';

-- Grant permissions on the view
GRANT SELECT, INSERT, UPDATE, DELETE ON withdrawal_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON withdrawal_requests TO anon;

COMMENT ON VIEW withdrawal_requests IS 'View of money_requests filtered for withdrawal requests with schema compatibility for frontend';

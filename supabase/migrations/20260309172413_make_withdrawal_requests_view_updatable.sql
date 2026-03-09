/*
  # Make withdrawal_requests view updatable
  
  1. Problem
    - withdrawal_requests is a VIEW with a JOIN, making it non-updatable by default
    - UPDATE operations fail because PostgreSQL cannot automatically update joined views
    - Finance approval workflow tries to UPDATE through the view
    
  2. Solution
    - Create INSTEAD OF triggers for INSERT, UPDATE, DELETE operations
    - Triggers will redirect operations to the underlying money_requests table
    - This makes the view behave like a normal table from the application's perspective
    
  3. Triggers
    - INSTEAD OF INSERT: Creates record in money_requests with request_type='withdrawal'
    - INSTEAD OF UPDATE: Updates the underlying money_requests record
    - INSTEAD OF DELETE: Deletes from money_requests
*/

-- Function to handle INSERT operations on withdrawal_requests view
CREATE OR REPLACE FUNCTION withdrawal_requests_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO money_requests (
    id,
    user_id,
    amount,
    reason,
    status,
    request_type,
    phone_number,
    payment_channel,
    disbursement_bank_name,
    disbursement_account_number,
    disbursement_account_name,
    requested_by,
    requires_three_approvals,
    wallet_balance_verified
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.user_id,
    NEW.amount,
    COALESCE(NEW.reason, 'Wallet Withdrawal'),
    COALESCE(NEW.status, 'pending_finance'),
    'withdrawal',
    NEW.phone_number,
    NEW.payment_channel,
    NEW.disbursement_bank_name,
    NEW.disbursement_account_number,
    NEW.disbursement_account_name,
    NEW.requested_by,
    COALESCE(NEW.requires_three_approvals, false),
    COALESCE(NEW.wallet_balance_verified, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle UPDATE operations on withdrawal_requests view
CREATE OR REPLACE FUNCTION withdrawal_requests_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE money_requests
  SET
    amount = NEW.amount,
    reason = NEW.reason,
    status = NEW.status,
    phone_number = NEW.phone_number,
    payment_channel = NEW.payment_channel,
    disbursement_bank_name = NEW.disbursement_bank_name,
    disbursement_account_number = NEW.disbursement_account_number,
    disbursement_account_name = NEW.disbursement_account_name,
    requires_three_approvals = NEW.requires_three_approvals,
    wallet_balance_verified = NEW.wallet_balance_verified,
    wallet_balance_at_approval = NEW.wallet_balance_at_approval,
    admin_approved = NEW.admin_approved,
    admin_approved_1 = NEW.admin_approved_1,
    admin_approved_1_by = NEW.admin_approved_1_by,
    admin_approved_1_at = NEW.admin_approved_1_at,
    admin_approved_2 = NEW.admin_approved_2,
    admin_approved_2_by = NEW.admin_approved_2_by,
    admin_approved_2_at = NEW.admin_approved_2_at,
    admin_approved_3 = NEW.admin_approved_3,
    admin_approved_3_by = NEW.admin_approved_3_by,
    admin_approved_3_at = NEW.admin_approved_3_at,
    approved_by = NEW.approved_by,
    approved_at = NEW.approved_at,
    rejection_reason = NEW.rejection_reason,
    finance_approved_by = NEW.finance_approved_by,
    finance_approved_at = NEW.finance_approved_at,
    finance_reviewed = NEW.finance_reviewed,
    finance_review_at = NEW.finance_review_at,
    finance_review_by = NEW.finance_review_by,
    admin_final_approval = NEW.admin_final_approval,
    admin_final_approval_at = NEW.admin_final_approval_at,
    admin_final_approval_by = NEW.admin_final_approval_by,
    updated_at = now()
  WHERE id = OLD.id
  AND request_type = 'withdrawal';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle DELETE operations on withdrawal_requests view
CREATE OR REPLACE FUNCTION withdrawal_requests_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM money_requests
  WHERE id = OLD.id
  AND request_type = 'withdrawal';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS withdrawal_requests_insert_trigger ON withdrawal_requests;
DROP TRIGGER IF EXISTS withdrawal_requests_update_trigger ON withdrawal_requests;
DROP TRIGGER IF EXISTS withdrawal_requests_delete_trigger ON withdrawal_requests;

-- Create INSTEAD OF triggers on the view
CREATE TRIGGER withdrawal_requests_insert_trigger
  INSTEAD OF INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION withdrawal_requests_insert();

CREATE TRIGGER withdrawal_requests_update_trigger
  INSTEAD OF UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION withdrawal_requests_update();

CREATE TRIGGER withdrawal_requests_delete_trigger
  INSTEAD OF DELETE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION withdrawal_requests_delete();

COMMENT ON FUNCTION withdrawal_requests_insert() IS 'Handles INSERT operations on withdrawal_requests view by creating records in money_requests';
COMMENT ON FUNCTION withdrawal_requests_update() IS 'Handles UPDATE operations on withdrawal_requests view by updating underlying money_requests records';
COMMENT ON FUNCTION withdrawal_requests_delete() IS 'Handles DELETE operations on withdrawal_requests view by deleting from money_requests';

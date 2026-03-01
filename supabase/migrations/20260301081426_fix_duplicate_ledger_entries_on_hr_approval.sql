/*
  # Fix Duplicate Ledger Entries on HR Payment Approval

  1. Problem
    - When approving HR payments, the system tries to create ledger entries
    - If a payment is approved twice (or retried), it creates duplicate ledger entries
    - This violates the UNIQUE constraint on ledger_entries.reference

  2. Solution
    - Update the process_withdrawal_status_change trigger to check for existing ledger entries
    - Only create a ledger entry if one doesn't already exist for this withdrawal/payment

  3. Security
    - Maintains existing security model
    - Prevents duplicate deductions from user balances
*/

-- Drop and recreate the trigger function with duplicate check
CREATE OR REPLACE FUNCTION process_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Set requires_three_approvals based on amount
  IF NEW.amount > 100000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;

  -- Skip processing for terminal statuses
  IF NEW.status IN ('rejected', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- When withdrawal is rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = now();
  END IF;

  -- Auto-update status based on approval state
  IF NEW.requires_three_approvals THEN
    -- 2 admins + finance
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      NEW.status := 'approved';
      NEW.approved_at := now();
    END IF;
  ELSE
    -- 1 admin + finance
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      NEW.status := 'approved';
      NEW.approved_at := now();
    END IF;
  END IF;

  -- When withdrawal becomes fully approved, create the ledger deduction
  -- BUT ONLY IF it doesn't already exist (prevent duplicates)
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Check if ledger entry already exists for this withdrawal
    IF NOT EXISTS (
      SELECT 1 FROM ledger_entries 
      WHERE reference = 'WITHDRAWAL-' || NEW.id
    ) THEN
      INSERT INTO ledger_entries (
        user_id,
        entry_type,
        amount,
        reference,
        metadata,
        created_at
      ) VALUES (
        NEW.user_id,
        'WITHDRAWAL',
        -NEW.amount,
        'WITHDRAWAL-' || NEW.id,
        json_build_object(
          'withdrawal_id', NEW.id,
          'phone_number', NEW.phone_number,
          'channel', NEW.channel,
          'disbursement_method', NEW.disbursement_method,
          'admin_approvals', CASE 
            WHEN NEW.requires_three_approvals THEN 2
            ELSE 1
          END,
          'finance_approved_by', NEW.finance_approved_by
        ),
        now()
      );
    END IF;
    NEW.processed_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

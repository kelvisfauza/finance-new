/*
  # Fix Duplicate Ledger Entries in process_withdrawal_approval

  1. Problem
    - The process_withdrawal_approval trigger doesn't check for existing ledger entries
    - If triggered multiple times, it creates duplicate entries
    - Violates unique constraint on ledger_entries.reference

  2. Solution
    - Add existence check before inserting ledger entry
    - Only create entry if it doesn't already exist

  3. Security
    - Maintains existing security model
    - Prevents duplicate deductions
*/

CREATE OR REPLACE FUNCTION process_withdrawal_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- When withdrawal status changes to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Check if ledger entry already exists (prevent duplicates)
        IF NOT EXISTS (
            SELECT 1 FROM ledger_entries 
            WHERE reference = 'WITHDRAWAL-' || NEW.id
        ) THEN
            -- Deduct the amount from user's ledger
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
                    'approved_by', NEW.approved_by
                ),
                now()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

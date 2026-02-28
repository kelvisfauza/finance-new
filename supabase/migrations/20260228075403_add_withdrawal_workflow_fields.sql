/*
  # Add Withdrawal Workflow Fields to money_requests

  1. New Columns Added
    - `admin_approved_1` (boolean) - First admin approval flag
    - `admin_approved_1_by` (text) - Email of first admin approver
    - `admin_approved_1_at` (timestamptz) - Timestamp of first approval
    - `admin_approved_2` (boolean) - Second admin approval flag
    - `admin_approved_2_by` (text) - Email of second admin approver
    - `admin_approved_2_at` (timestamptz) - Timestamp of second approval
    - `admin_approved_3` (boolean) - Third admin approval flag
    - `admin_approved_3_by` (text) - Email of third admin approver
    - `admin_approved_3_at` (timestamptz) - Timestamp of third approval
    - `requires_three_approvals` (boolean) - Auto-set based on amount > 100,000
    - `disbursement_bank_name` (text) - Bank name for bank transfers
    - `disbursement_account_number` (text) - Bank account number
    - `disbursement_account_name` (text) - Account holder name
    - `wallet_balance_verified` (boolean) - Flag indicating balance was checked
    - `wallet_balance_at_approval` (numeric) - User's balance when approved

  2. Purpose
    - Support tiered admin approval workflow (1 or 3 approvals based on amount)
    - Enable bank transfer disbursements
    - Track wallet balance verification for audit purposes
    - Ensure 3 different admins approve high-value withdrawals (> 100,000 UGX)

  3. Workflow Logic
    - Amounts ≤ 100,000 UGX: requires_three_approvals = false (1 admin needed)
    - Amounts > 100,000 UGX: requires_three_approvals = true (3 admins needed)
    - Finance can only approve after all required admin approvals are complete
    - System prevents self-approval by checking approver emails

  4. Security
    - All columns are optional to support gradual migration
    - Default values prevent NULL-related issues
    - Audit trail preserved with timestamps and approver emails
*/

-- Add admin approval tracking columns
ALTER TABLE public.money_requests
ADD COLUMN IF NOT EXISTS admin_approved_1 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_1_by text,
ADD COLUMN IF NOT EXISTS admin_approved_1_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_approved_2 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_2_by text,
ADD COLUMN IF NOT EXISTS admin_approved_2_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_approved_3 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_3_by text,
ADD COLUMN IF NOT EXISTS admin_approved_3_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_three_approvals boolean DEFAULT false;

-- Add bank transfer support columns
ALTER TABLE public.money_requests
ADD COLUMN IF NOT EXISTS disbursement_bank_name text,
ADD COLUMN IF NOT EXISTS disbursement_account_number text,
ADD COLUMN IF NOT EXISTS disbursement_account_name text;

-- Add wallet verification columns
ALTER TABLE public.money_requests
ADD COLUMN IF NOT EXISTS wallet_balance_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_balance_at_approval numeric DEFAULT 0;

-- Create function to auto-set requires_three_approvals based on amount
CREATE OR REPLACE FUNCTION set_withdrawal_approval_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- Set requires_three_approvals based on amount threshold
  IF NEW.amount > 100000 THEN
    NEW.requires_three_approvals = true;
  ELSE
    NEW.requires_three_approvals = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set approval requirements on insert/update
DROP TRIGGER IF EXISTS set_withdrawal_approval_requirements_trigger ON public.money_requests;
CREATE TRIGGER set_withdrawal_approval_requirements_trigger
  BEFORE INSERT OR UPDATE OF amount
  ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_withdrawal_approval_requirements();

-- Update existing records to set requires_three_approvals correctly
UPDATE public.money_requests
SET requires_three_approvals = (amount > 100000)
WHERE requires_three_approvals IS NULL OR requires_three_approvals = false;

-- Create index for filtering by approval requirements
CREATE INDEX IF NOT EXISTS idx_money_requests_approval_requirements
  ON public.money_requests(requires_three_approvals, status)
  WHERE status = 'pending';

-- Create index for admin approval tracking
CREATE INDEX IF NOT EXISTS idx_money_requests_admin_approvals
  ON public.money_requests(admin_approved_1, admin_approved_2, admin_approved_3, status)
  WHERE status = 'pending';

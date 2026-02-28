/*
  # Fix Withdrawal Balance Deduction Logic (v2)

  1. Problem
    - Current trigger ADDS money to wallet on all money request approvals
    - Need to differentiate between:
      - Advances/Salary/Bonus: ADD to wallet (money coming IN)
      - Withdrawals: DEDUCT from wallet (money going OUT)

  2. Changes
    - Replace the incorrect `process_money_request_approval` function
    - New logic: Check request_type to determine if we add or subtract
    - Withdrawals deduct from wallet, everything else adds to wallet
    - Update check constraint to include existing request types

  3. Request Types
    - 'advance' - ADD to wallet
    - 'Mid-Month Salary' - ADD to wallet
    - 'bonus' - ADD to wallet
    - 'emergency' - ADD to wallet
    - 'salary' - ADD to wallet
    - 'withdrawal' - DEDUCT from wallet (NEW)

  4. Safety
    - Only processes when status changes to 'approved'
    - Validates sufficient balance for withdrawals
    - Preserves existing behavior for advances/salary
*/

-- Drop old trigger function
DROP FUNCTION IF EXISTS process_money_request_approval() CASCADE;

-- Create corrected function that handles both withdrawals and advances
CREATE OR REPLACE FUNCTION process_money_request_approval()
RETURNS TRIGGER AS $$
DECLARE
  current_user_balance numeric;
BEGIN
  -- Only process if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Check request type to determine if we add or subtract from wallet
    IF NEW.request_type = 'withdrawal' THEN
      -- WITHDRAWAL: Deduct from wallet balance
      
      -- Get current user balance
      SELECT current_balance INTO current_user_balance
      FROM public.user_accounts
      WHERE user_id = NEW.user_id;
      
      -- If user account doesn't exist, they have 0 balance
      IF current_user_balance IS NULL THEN
        current_user_balance = 0;
      END IF;
      
      -- Verify sufficient balance
      IF current_user_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. User has % but withdrawal amount is %', 
          current_user_balance, NEW.amount;
      END IF;
      
      -- Record balance at time of approval for audit
      NEW.wallet_balance_at_approval = current_user_balance;
      NEW.wallet_balance_verified = true;
      
      -- Deduct from wallet
      INSERT INTO public.user_accounts (user_id, current_balance, total_withdrawn)
      VALUES (NEW.user_id, -NEW.amount, NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_balance = user_accounts.current_balance - NEW.amount,
        total_withdrawn = user_accounts.total_withdrawn + NEW.amount,
        updated_at = now();
        
    ELSE
      -- ADVANCE/SALARY/BONUS/EMERGENCY: Add to wallet balance
      INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
      VALUES (NEW.user_id, NEW.amount, NEW.amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_balance = user_accounts.current_balance + NEW.amount,
        salary_approved = user_accounts.salary_approved + NEW.amount,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_money_request_approved ON public.money_requests;
CREATE TRIGGER on_money_request_approved
  BEFORE UPDATE ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_money_request_approval();

-- Update check constraint to include all valid request types
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'money_requests' 
    AND constraint_name = 'money_requests_request_type_check'
  ) THEN
    ALTER TABLE public.money_requests DROP CONSTRAINT money_requests_request_type_check;
  END IF;
  
  -- Add updated constraint with all valid types
  ALTER TABLE public.money_requests
  ADD CONSTRAINT money_requests_request_type_check 
  CHECK (request_type IN ('advance', 'Mid-Month Salary', 'bonus', 'emergency', 'salary', 'withdrawal'));
END $$;

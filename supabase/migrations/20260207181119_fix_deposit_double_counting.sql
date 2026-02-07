/*
  # Fix Deposit Double-Counting Issue
  
  ## Problem
  When finance deposits are created with status='pending':
  1. The balance_after field is calculated including the deposit amount
  2. This makes the balance appear to clear overdrafts in the UI
  3. When the deposit is confirmed, the amount is added again to current_balance
  4. This causes double-counting of the deposit
  
  ## Solution
  Create triggers to properly handle balance calculations:
  1. For pending transactions: balance_after is calculated but current_balance is NOT updated
  2. For confirmed transactions: current_balance is updated to match the confirmed balance_after
  3. When confirming a transaction: current_balance is set to the transaction's balance_after (not incremented again)
  
  ## Changes
  1. Create trigger function to handle transaction inserts and updates
  2. Add trigger to finance_cash_transactions table
  3. Ensure balance updates only happen when transactions are confirmed
*/

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS handle_finance_cash_transaction_changes ON finance_cash_transactions;
DROP FUNCTION IF EXISTS handle_finance_cash_transaction_changes();

-- Create function to handle transaction changes
CREATE OR REPLACE FUNCTION handle_finance_cash_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
  v_last_confirmed_balance numeric;
BEGIN
  -- Get the current confirmed balance (from finance_cash_balance table)
  SELECT current_balance INTO v_current_balance
  FROM finance_cash_balance
  LIMIT 1;
  
  -- If no balance record exists, initialize it
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
    INSERT INTO finance_cash_balance (current_balance, updated_by, singleton)
    VALUES (0, COALESCE(NEW.created_by, 'system'), true)
    ON CONFLICT (singleton) DO NOTHING;
  END IF;
  
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    -- Calculate balance_after for the new transaction
    -- For pending transactions, calculate what the balance WOULD be
    -- For confirmed transactions, this will become the actual balance
    NEW.balance_after := v_current_balance + NEW.amount;
    
    -- Only update current_balance if the transaction is confirmed
    IF NEW.status = 'confirmed' THEN
      UPDATE finance_cash_balance
      SET current_balance = NEW.balance_after,
          last_updated = now(),
          updated_by = NEW.created_by;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE operations (e.g., confirming a pending transaction)
  IF TG_OP = 'UPDATE' THEN
    -- If status changed from pending to confirmed
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
      -- Get the last confirmed transaction's balance (before this one)
      SELECT COALESCE(
        (SELECT balance_after 
         FROM finance_cash_transactions 
         WHERE status = 'confirmed' 
           AND created_at < NEW.created_at
         ORDER BY created_at DESC 
         LIMIT 1),
        0
      ) INTO v_last_confirmed_balance;
      
      -- Recalculate balance_after based on last confirmed balance
      NEW.balance_after := v_last_confirmed_balance + NEW.amount;
      NEW.confirmed_at := now();
      NEW.confirmed_by := NEW.confirmed_by;
      
      -- Update current_balance to the new confirmed balance
      UPDATE finance_cash_balance
      SET current_balance = NEW.balance_after,
          last_updated = now(),
          updated_by = COALESCE(NEW.confirmed_by, NEW.created_by);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to handle transaction changes
CREATE TRIGGER handle_finance_cash_transaction_changes
  BEFORE INSERT OR UPDATE ON finance_cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_finance_cash_transaction_changes();

-- Add comment
COMMENT ON FUNCTION handle_finance_cash_transaction_changes() IS 
  'Prevents double-counting of deposits by ensuring balance is only updated when transactions are confirmed';

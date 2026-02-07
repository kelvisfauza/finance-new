/*
  # Fix handle_finance_cash_transaction_changes trigger function

  1. Changes
    - Add WHERE clause to all UPDATE statements in the trigger function
    - This fixes the "UPDATE requires a WHERE clause" error

  2. Security
    - No change to security policies
    - Just fixing the trigger function to include proper WHERE clauses
*/

CREATE OR REPLACE FUNCTION handle_finance_cash_transaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance numeric;
  v_last_confirmed_balance numeric;
BEGIN
  -- Get the current confirmed balance (from finance_cash_balance table)
  SELECT current_balance INTO v_current_balance
  FROM finance_cash_balance
  WHERE singleton = true
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
          updated_by = NEW.created_by
      WHERE singleton = true;
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
          updated_by = COALESCE(NEW.confirmed_by, NEW.created_by)
      WHERE singleton = true;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

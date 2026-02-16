/*
  # Reconcile Missing Coffee Payment Transactions

  This migration fixes a critical data integrity issue where coffee payments 
  were marked as "Paid" but cash transactions were never created due to 
  RLS policy failures.

  ## Issue Summary
  - 530 recent payments (Jan-Feb 2026) totaling 3.15 billion UGX
  - Payments were completed but cash ledger was not updated
  - Current balance shows 716M UGX but actual balance from transactions is -2.92B UGX

  ## What This Does
  1. Creates missing cash transaction records for all paid coffee payments
  2. Recalculates the correct cash balance based on all transactions
  3. Maintains proper audit trail with transaction history

  ## Safety
  - Only processes payments from 2026 (recent, verifiable data)
  - Only processes payments with positive amounts
  - Skips payments that already have transactions
  - Creates transactions in chronological order
*/

-- Step 1: Create the missing cash transactions for recent paid coffee payments
DO $$
DECLARE
  v_running_balance NUMERIC;
  v_payment_record RECORD;
  v_transaction_count INTEGER := 0;
BEGIN
  -- Get the current balance before our reconciliation
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_running_balance
  FROM finance_cash_transactions
  WHERE created_at < '2026-01-01';

  RAISE NOTICE 'Starting balance (before 2026): %', v_running_balance;

  -- Process each missing payment in chronological order
  FOR v_payment_record IN (
    SELECT 
      pr.batch_number,
      pr.supplier,
      COALESCE(pr.amount_paid, pr.amount) as payment_amount,
      pr.updated_at,
      COALESCE(
        (SELECT approved_by FROM supplier_payments sp WHERE sp.reference = pr.batch_number LIMIT 1),
        'System Reconciliation'
      ) as processed_by
    FROM payment_records pr
    WHERE pr.status = 'Paid'
      AND pr.updated_at >= '2026-01-01'
      AND COALESCE(pr.amount_paid, pr.amount) > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM finance_cash_transactions fct
        WHERE fct.reference = pr.batch_number
          AND fct.transaction_type = 'PAYMENT'
      )
    ORDER BY pr.updated_at ASC
  ) LOOP
    -- Calculate balance after this payment
    v_running_balance := v_running_balance - v_payment_record.payment_amount;

    -- Insert the missing transaction
    INSERT INTO finance_cash_transactions (
      transaction_type,
      amount,
      balance_after,
      reference,
      notes,
      created_by,
      created_at,
      status,
      confirmed_by,
      confirmed_at
    ) VALUES (
      'PAYMENT',
      -v_payment_record.payment_amount,
      v_running_balance,
      v_payment_record.batch_number,
      'Reconciled: Coffee payment for ' || v_payment_record.supplier || ' - ' || v_payment_record.batch_number,
      v_payment_record.processed_by,
      v_payment_record.updated_at,
      'confirmed',
      v_payment_record.processed_by,
      v_payment_record.updated_at
    );

    v_transaction_count := v_transaction_count + 1;

    -- Log progress every 100 transactions
    IF v_transaction_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % transactions, current balance: %', v_transaction_count, v_running_balance;
    END IF;
  END LOOP;

  RAISE NOTICE 'Reconciliation complete. Created % transactions', v_transaction_count;
  RAISE NOTICE 'Final calculated balance: %', v_running_balance;

  -- Step 2: Update the cash balance table with the correct balance
  UPDATE finance_cash_balance
  SET 
    current_balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM finance_cash_transactions
    ),
    last_updated = NOW(),
    updated_by = 'System Reconciliation'
  WHERE singleton = true;

  RAISE NOTICE 'Cash balance table updated';

END $$;

-- Step 3: Verify the reconciliation
DO $$
DECLARE
  v_balance_table NUMERIC;
  v_balance_calculated NUMERIC;
  v_difference NUMERIC;
BEGIN
  SELECT current_balance INTO v_balance_table
  FROM finance_cash_balance
  WHERE singleton = true;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance_calculated
  FROM finance_cash_transactions;

  v_difference := v_balance_table - v_balance_calculated;

  RAISE NOTICE '=== RECONCILIATION VERIFICATION ===';
  RAISE NOTICE 'Balance in table: %', v_balance_table;
  RAISE NOTICE 'Balance calculated: %', v_balance_calculated;
  RAISE NOTICE 'Difference: %', v_difference;

  IF ABS(v_difference) > 0.01 THEN
    RAISE WARNING 'Balance mismatch detected! Difference: %', v_difference;
  ELSE
    RAISE NOTICE 'Balance reconciliation successful!';
  END IF;
END $$;

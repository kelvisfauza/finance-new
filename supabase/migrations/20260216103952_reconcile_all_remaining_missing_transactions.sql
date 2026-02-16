/*
  # Reconcile All Remaining Missing Coffee Payment Transactions

  This migration completes the reconciliation by processing all remaining
  paid coffee payments that don't have corresponding cash transactions.

  ## Remaining Issues
  - 975 payments from Nov-Dec 2025 totaling 14.58 billion UGX
  - These payments were completed but never recorded in cash ledger

  ## What This Does
  1. Creates missing cash transaction records for all remaining paid payments
  2. Recalculates the correct cash balance including all historical transactions
  3. Processes transactions in chronological order to maintain audit trail

  ## Safety
  - Only processes payments with positive amounts
  - Skips payments that already have transactions
  - Maintains chronological order
*/

-- Create the missing cash transactions for all remaining paid coffee payments
DO $$
DECLARE
  v_running_balance NUMERIC;
  v_payment_record RECORD;
  v_transaction_count INTEGER := 0;
  v_start_balance NUMERIC;
BEGIN
  -- Get the balance at the start of November 2025
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_start_balance
  FROM finance_cash_transactions
  WHERE created_at < '2025-11-01';

  v_running_balance := v_start_balance;
  
  RAISE NOTICE 'Starting balance (before Nov 2025): %', v_running_balance;

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
      AND pr.updated_at >= '2025-11-01'
      AND pr.updated_at < '2026-01-01'
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
  RAISE NOTICE 'Balance after Nov-Dec 2025 reconciliation: %', v_running_balance;

  -- Update the cash balance table with the correct balance
  UPDATE finance_cash_balance
  SET 
    current_balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM finance_cash_transactions
    ),
    last_updated = NOW(),
    updated_by = 'System Reconciliation - Complete'
  WHERE singleton = true;

  RAISE NOTICE 'Cash balance table updated with complete reconciliation';

END $$;

-- Final verification
DO $$
DECLARE
  v_balance_table NUMERIC;
  v_balance_calculated NUMERIC;
  v_difference NUMERIC;
  v_total_deposits NUMERIC;
  v_total_payments NUMERIC;
  v_remaining_missing INTEGER;
BEGIN
  SELECT current_balance INTO v_balance_table
  FROM finance_cash_balance
  WHERE singleton = true;

  SELECT COALESCE(SUM(amount), 0) INTO v_balance_calculated
  FROM finance_cash_transactions;

  SELECT 
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)
  INTO v_total_deposits, v_total_payments
  FROM finance_cash_transactions;

  SELECT COUNT(*)
  INTO v_remaining_missing
  FROM payment_records pr
  WHERE pr.status = 'Paid'
    AND COALESCE(pr.amount_paid, pr.amount) > 0
    AND NOT EXISTS (
      SELECT 1 
      FROM finance_cash_transactions fct
      WHERE fct.reference = pr.batch_number
        AND fct.transaction_type = 'PAYMENT'
    );

  v_difference := v_balance_table - v_balance_calculated;

  RAISE NOTICE '=== FINAL RECONCILIATION REPORT ===';
  RAISE NOTICE 'Total Deposits: % UGX', v_total_deposits;
  RAISE NOTICE 'Total Payments: % UGX', v_total_payments;
  RAISE NOTICE 'Net Balance in Table: % UGX', v_balance_table;
  RAISE NOTICE 'Net Balance Calculated: % UGX', v_balance_calculated;
  RAISE NOTICE 'Difference: % UGX', v_difference;
  RAISE NOTICE 'Remaining Missing Transactions: %', v_remaining_missing;

  IF ABS(v_difference) > 0.01 THEN
    RAISE WARNING 'Balance mismatch detected! Difference: %', v_difference;
  ELSE
    RAISE NOTICE '✓ Balance reconciliation successful!';
  END IF;

  IF v_remaining_missing > 0 THEN
    RAISE WARNING 'There are still % unreconciled transactions', v_remaining_missing;
  ELSE
    RAISE NOTICE '✓ All transactions reconciled!';
  END IF;
END $$;

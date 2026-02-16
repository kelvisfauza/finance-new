/*
  # Create Missing Supplier Payments for Today's Transactions

  ## Summary
  Creates supplier_payments records for today's reconciled coffee payments
  that appear in cash transactions but not in supplier_payments table.

  ## Issue
  - 8 coffee payments from today show in Cash Management
  - But they don't appear in Coffee Payments page
  - Missing supplier_payments records

  ## Solution
  Create supplier_payments records for today's reconciled transactions
  that don't already have corresponding supplier_payments entries.

  ## Safety
  - Only processes today's transactions
  - Skips if supplier_payment with same reference already exists
  - Handles supplier name matching gracefully
*/

DO $$
DECLARE
  v_transaction RECORD;
  v_supplier_id UUID;
  v_supplier_name TEXT;
  v_payment_amount NUMERIC;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting to process today''s reconciled payments...';
  
  -- Process each reconciled payment transaction from today
  FOR v_transaction IN (
    SELECT 
      id,
      reference,
      amount,
      notes,
      created_at,
      created_by
    FROM finance_cash_transactions
    WHERE transaction_type = 'PAYMENT'
      AND created_by = 'System Reconciliation'
      AND reference IS NOT NULL
      AND created_at >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 
        FROM supplier_payments sp 
        WHERE sp.reference = finance_cash_transactions.reference
      )
    ORDER BY created_at ASC
  ) LOOP
    -- Extract supplier name from notes like "Reconciled: Coffee payment for sam - 20260211001"
    v_supplier_name := substring(v_transaction.notes from 'Coffee payment for ([^-]+)');
    v_supplier_name := trim(v_supplier_name);
    
    -- Get payment amount (stored as negative in cash transactions)
    v_payment_amount := ABS(v_transaction.amount);
    
    -- Try to find matching supplier (case-insensitive)
    SELECT id INTO v_supplier_id
    FROM suppliers
    WHERE LOWER(name) = LOWER(v_supplier_name)
    LIMIT 1;
    
    -- If supplier not found, log and skip
    IF v_supplier_id IS NULL THEN
      RAISE NOTICE 'Supplier not found for payment %: "%"', v_transaction.reference, v_supplier_name;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- Create the supplier payment record
    BEGIN
      INSERT INTO supplier_payments (
        supplier_id,
        lot_id,
        method,
        status,
        requested_by,
        approved_by,
        approved_at,
        gross_payable_ugx,
        advance_recovered_ugx,
        amount_paid_ugx,
        reference,
        notes,
        is_duplicate,
        created_at
      ) VALUES (
        v_supplier_id,
        NULL,
        'CASH',
        'POSTED',
        v_transaction.created_by,
        v_transaction.created_by,
        v_transaction.created_at,
        v_payment_amount,
        0,
        v_payment_amount,
        v_transaction.reference,
        'Reconciled payment: ' || v_transaction.notes,
        false,
        v_transaction.created_at
      );
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE 'Created payment for % (%) - %', v_supplier_name, v_transaction.reference, v_payment_amount;
      
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Payment already exists for reference %', v_transaction.reference;
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Created: % supplier payment records', v_created_count;
  RAISE NOTICE 'Skipped: % records', v_skipped_count;
END $$;

-- Verify the results
DO $$
DECLARE
  v_payments_today INTEGER;
  v_cash_txns_today INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_payments_today
  FROM supplier_payments
  WHERE approved_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_cash_txns_today
  FROM finance_cash_transactions
  WHERE transaction_type = 'PAYMENT'
    AND created_at >= CURRENT_DATE;
  
  RAISE NOTICE '=== TODAY''S VERIFICATION ===';
  RAISE NOTICE 'Supplier payments today: %', v_payments_today;
  RAISE NOTICE 'Cash payment transactions today: %', v_cash_txns_today;
END $$;

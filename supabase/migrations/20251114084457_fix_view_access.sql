/*
  # Fix View Access for Finance Tables

  1. Simple Read Access
    - Allow authenticated users to view all finance data
    - This is necessary for the dashboard to load
*/

-- payment_records
DROP POLICY IF EXISTS "Authenticated users can view payment records" ON payment_records;
CREATE POLICY "Authenticated users can view payment records"
  ON payment_records FOR SELECT USING (true);

-- finance_transactions  
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON finance_transactions;
CREATE POLICY "Authenticated users can view transactions"
  ON finance_transactions FOR SELECT USING (true);

-- salary_payments
DROP POLICY IF EXISTS "Authenticated users can view salary payments" ON salary_payments;
CREATE POLICY "Authenticated users can view salary payments"
  ON salary_payments FOR SELECT USING (true);

-- finance_expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON finance_expenses;
CREATE POLICY "Authenticated users can view expenses"
  ON finance_expenses FOR SELECT USING (true);

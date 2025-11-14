/*
  # Optimize Finance RLS Policies

  1. Performance Improvements
    - Wrap auth functions in SELECT to prevent re-evaluation for each row
    - Focus on finance-related tables used by the application
    
  2. Tables Optimized
    - finance_transactions
    - finance_expenses
    - salary_payments
    - finance_payments
    - finance_prices
    - finance_ledgers
*/

-- Optimize finance_transactions policies
DROP POLICY IF EXISTS "Authenticated users can manage finance transactions" ON finance_transactions;
CREATE POLICY "Authenticated users can manage finance transactions"
  ON finance_transactions
  FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize finance_expenses policies
DROP POLICY IF EXISTS "Authenticated users can manage finance expenses" ON finance_expenses;
CREATE POLICY "Authenticated users can manage finance expenses"
  ON finance_expenses
  FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "auth read" ON finance_expenses;
CREATE POLICY "auth read"
  ON finance_expenses
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth write" ON finance_expenses;
CREATE POLICY "auth write"
  ON finance_expenses
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth update" ON finance_expenses;
CREATE POLICY "auth update"
  ON finance_expenses
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- Optimize salary_payments policies
DROP POLICY IF EXISTS "Authenticated users can manage salary payments" ON salary_payments;
CREATE POLICY "Authenticated users can manage salary payments"
  ON salary_payments
  FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize finance_payments policies
DROP POLICY IF EXISTS "auth read" ON finance_payments;
CREATE POLICY "auth read"
  ON finance_payments
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth write" ON finance_payments;
CREATE POLICY "auth write"
  ON finance_payments
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth update" ON finance_payments;
CREATE POLICY "auth update"
  ON finance_payments
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- Optimize finance_prices policies
DROP POLICY IF EXISTS "auth read" ON finance_prices;
CREATE POLICY "auth read"
  ON finance_prices
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth write" ON finance_prices;
CREATE POLICY "auth write"
  ON finance_prices
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth update" ON finance_prices;
CREATE POLICY "auth update"
  ON finance_prices
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- Optimize finance_ledgers policies
DROP POLICY IF EXISTS "auth read" ON finance_ledgers;
CREATE POLICY "auth read"
  ON finance_ledgers
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth write" ON finance_ledgers;
CREATE POLICY "auth write"
  ON finance_ledgers
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "auth update" ON finance_ledgers;
CREATE POLICY "auth update"
  ON finance_ledgers
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- Optimize finance_cash_transactions policy
DROP POLICY IF EXISTS "Finance users can update cash transactions" ON finance_cash_transactions;
CREATE POLICY "Finance users can update cash transactions"
  ON finance_cash_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = (SELECT auth.uid())
      AND (employees.department = 'Finance' OR employees.permissions @> ARRAY['Finance'])
    )
  );

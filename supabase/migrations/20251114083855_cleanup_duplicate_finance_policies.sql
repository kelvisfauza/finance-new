/*
  # Clean Up Duplicate RLS Policies

  1. Policy Cleanup
    - Remove duplicate/redundant permissive policies on finance tables
    - Keep the most restrictive and performant policies
    - Consolidate overlapping policies
    
  2. Tables Affected
    - finance_expenses
    - finance_transactions
    - salary_payments
    - payment_records
    - approval_requests
*/

-- Clean up finance_expenses - remove redundant "Anyone can" policies since we have auth policies
DROP POLICY IF EXISTS "Anyone can insert finance_expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Anyone can view finance_expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Anyone can update finance_expenses" ON finance_expenses;

-- Clean up finance_transactions - remove redundant "Anyone can" policies
DROP POLICY IF EXISTS "Anyone can insert finance_transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Anyone can view finance_transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Anyone can update finance_transactions" ON finance_transactions;

-- Clean up salary_payments - remove redundant "Anyone can" policies
DROP POLICY IF EXISTS "Anyone can insert salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Anyone can view salary payments" ON salary_payments;
DROP POLICY IF EXISTS "Anyone can update salary payments" ON salary_payments;

-- Clean up payment_records - remove redundant "Anyone can" policies
DROP POLICY IF EXISTS "Anyone can insert payment_records" ON payment_records;
DROP POLICY IF EXISTS "Anyone can view payment_records" ON payment_records;
DROP POLICY IF EXISTS "Anyone can update payment_records" ON payment_records;

-- Clean up approval_requests - consolidate duplicate policies
DROP POLICY IF EXISTS "Anyone can insert approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can view approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can update approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can insert approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can view approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can update approval_requests" ON approval_requests;

-- Keep only the authenticated user management policy which is more secure
-- (Already exists from previous migration: "Authenticated users can manage approval requests")

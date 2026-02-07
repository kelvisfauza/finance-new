/*
  # Fix supplier tables RLS Policy Issues

  1. Changes
    - Drop the overly broad "ALL" policies from supplier_payments and supplier_advances
    - Replace with specific policies for each operation
    - Ensure policies work correctly with proper USING and WITH CHECK clauses

  2. Security
    - Maintain finance user and admin access through specific policies
    - Ensure authenticated users can perform necessary operations
*/

-- Fix supplier_payments policies
DROP POLICY IF EXISTS "Finance can manage supplier_payments" ON supplier_payments;

CREATE POLICY "Finance can view supplier_payments"
  ON supplier_payments
  FOR SELECT
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can insert supplier_payments"
  ON supplier_payments
  FOR INSERT
  TO public
  WITH CHECK (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can update supplier_payments"
  ON supplier_payments
  FOR UPDATE
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  )
  WITH CHECK (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can delete supplier_payments"
  ON supplier_payments
  FOR DELETE
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

-- Fix supplier_advances policies
DROP POLICY IF EXISTS "Finance can manage supplier_advances" ON supplier_advances;

CREATE POLICY "Finance can view supplier_advances"
  ON supplier_advances
  FOR SELECT
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can insert supplier_advances"
  ON supplier_advances
  FOR INSERT
  TO public
  WITH CHECK (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can update supplier_advances"
  ON supplier_advances
  FOR UPDATE
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  )
  WITH CHECK (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can delete supplier_advances"
  ON supplier_advances
  FOR DELETE
  TO public
  USING (
    user_has_permission('Finance Management'::text) 
    OR is_current_user_admin()
  );

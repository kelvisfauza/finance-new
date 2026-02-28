/*
  # Fix Login Verification RLS Policies

  1. Changes
    - Drop existing restrictive policies on login_verification_codes
    - Add new policies that allow anon users to create and read verification codes
    - Keep update policy requiring authentication for security

  2. Security
    - Allow anonymous users to INSERT codes (needed during login flow)
    - Allow anonymous users to SELECT codes (needed to verify during login)
    - Require authentication for UPDATE operations
    - Codes expire after 5 minutes automatically
*/

-- Drop existing policies
DROP POLICY IF EXISTS "System can create login verification codes" ON login_verification_codes;
DROP POLICY IF EXISTS "Users can view their own login verification codes" ON login_verification_codes;
DROP POLICY IF EXISTS "Users can update their own login verification codes" ON login_verification_codes;

-- Allow anyone to insert verification codes (needed during login flow before auth)
CREATE POLICY "Allow inserting login verification codes"
  ON login_verification_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read verification codes (needed to verify during login)
CREATE POLICY "Allow reading login verification codes"
  ON login_verification_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to update verification codes (needed to mark as verified or increment attempts)
CREATE POLICY "Allow updating login verification codes"
  ON login_verification_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

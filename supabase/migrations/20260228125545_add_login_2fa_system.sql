/*
  # Add 2FA SMS Verification for Login

  1. New Tables
    - `login_verification_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `phone_number` (text)
      - `verification_code` (text) - 6-digit code
      - `expires_at` (timestamptz) - code valid for 5 minutes
      - `verified` (boolean) - whether code was used
      - `attempts` (integer) - failed verification attempts
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `login_verification_codes` table
    - Add policies for authenticated users to manage their own codes
    - Add index on user_id and expires_at for performance

  3. Important Notes
    - Verification codes expire after 5 minutes
    - Maximum 3 verification attempts per code
    - Users must verify SMS code to complete login
*/

-- Create login verification codes table
CREATE TABLE IF NOT EXISTS login_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_login_verification_user_id
  ON login_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_verification_expires
  ON login_verification_codes(expires_at) WHERE verified = false;

-- Enable RLS
ALTER TABLE login_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policies for login verification codes
CREATE POLICY "Users can view their own login verification codes"
  ON login_verification_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create login verification codes"
  ON login_verification_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own login verification codes"
  ON login_verification_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to cleanup expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM login_verification_codes
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

COMMENT ON TABLE login_verification_codes IS 'Stores SMS verification codes for 2FA login';
COMMENT ON FUNCTION cleanup_expired_login_codes IS 'Removes expired login verification codes older than 1 hour';

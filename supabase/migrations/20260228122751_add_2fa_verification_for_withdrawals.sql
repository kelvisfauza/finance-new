/*
  # Add 2FA Verification for Withdrawal Approvals

  1. New Tables
    - `user_security_questions` - Stores user's security questions and answers
      - `id` (uuid, primary key)
      - `user_id` (text, references auth.uid)
      - `user_email` (text, indexed)
      - `question_1` (text)
      - `answer_1_hash` (text, bcrypt hash)
      - `question_2` (text)
      - `answer_2_hash` (text, bcrypt hash)
      - `question_3` (text)
      - `answer_3_hash` (text, bcrypt hash)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `withdrawal_verification_codes` - Stores SMS verification codes
      - `id` (uuid, primary key)
      - `withdrawal_request_id` (uuid, references withdrawal_requests)
      - `approver_email` (text)
      - `approver_phone` (text)
      - `verification_code` (text, 6-digit code)
      - `code_expires_at` (timestamptz, valid for 5 minutes)
      - `verified` (boolean, default false)
      - `verified_at` (timestamptz)
      - `attempts` (integer, default 0, max 3)
      - `created_at` (timestamptz)

    - `withdrawal_approval_logs` - Audit trail for all approval actions
      - `id` (uuid, primary key)
      - `withdrawal_request_id` (uuid)
      - `approver_email` (text)
      - `action` (text: 'verification_sent', 'verification_success', 'verification_failed', 'approved', 'rejected')
      - `verification_method` (text: 'sms', 'security_questions', null)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only manage their own security questions
    - Only approvers can access verification codes
    - Audit logs are read-only and viewable by Finance users

  3. Indexes
    - Add indexes on foreign keys and lookup columns
*/

-- Create user_security_questions table
CREATE TABLE IF NOT EXISTS user_security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_email text NOT NULL,
  question_1 text NOT NULL,
  answer_1_hash text NOT NULL,
  question_2 text NOT NULL,
  answer_2_hash text NOT NULL,
  question_3 text NOT NULL,
  answer_3_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_security_questions UNIQUE (user_email)
);

CREATE INDEX IF NOT EXISTS idx_user_security_questions_user_id ON user_security_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_questions_user_email ON user_security_questions(user_email);

-- Create withdrawal_verification_codes table
CREATE TABLE IF NOT EXISTS withdrawal_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id uuid NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  approver_email text NOT NULL,
  approver_phone text NOT NULL,
  verification_code text NOT NULL,
  code_expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_verification_codes_request_id ON withdrawal_verification_codes(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_verification_codes_approver_email ON withdrawal_verification_codes(approver_email);
CREATE INDEX IF NOT EXISTS idx_withdrawal_verification_codes_expires_at ON withdrawal_verification_codes(code_expires_at);

-- Create withdrawal_approval_logs table
CREATE TABLE IF NOT EXISTS withdrawal_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id uuid NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  approver_email text NOT NULL,
  action text NOT NULL,
  verification_method text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_approval_logs_request_id ON withdrawal_approval_logs(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_approval_logs_approver_email ON withdrawal_approval_logs(approver_email);
CREATE INDEX IF NOT EXISTS idx_withdrawal_approval_logs_created_at ON withdrawal_approval_logs(created_at DESC);

-- Enable RLS
ALTER TABLE user_security_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_security_questions
CREATE POLICY "Users can view own security questions"
  ON user_security_questions
  FOR SELECT
  TO public
  USING (
    user_id = auth.uid()::text
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own security questions"
  ON user_security_questions
  FOR INSERT
  TO public
  WITH CHECK (
    user_id = auth.uid()::text
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own security questions"
  ON user_security_questions
  FOR UPDATE
  TO public
  USING (
    user_id = auth.uid()::text
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()::text
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies for withdrawal_verification_codes
CREATE POLICY "Approvers can view own verification codes"
  ON withdrawal_verification_codes
  FOR SELECT
  TO public
  USING (
    approver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can create verification codes"
  ON withdrawal_verification_codes
  FOR INSERT
  TO public
  WITH CHECK (
    user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can update verification codes"
  ON withdrawal_verification_codes
  FOR UPDATE
  TO public
  USING (
    user_has_permission('Finance:approve')
    OR is_current_user_admin()
  )
  WITH CHECK (
    user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

-- RLS Policies for withdrawal_approval_logs
CREATE POLICY "Finance can view approval logs"
  ON withdrawal_approval_logs
  FOR SELECT
  TO public
  USING (
    user_has_permission('Finance:view')
    OR user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

CREATE POLICY "Finance can insert approval logs"
  ON withdrawal_approval_logs
  FOR INSERT
  TO public
  WITH CHECK (
    user_has_permission('Finance:approve')
    OR is_current_user_admin()
  );

-- Function to generate 6-digit verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$;

-- Function to create verification code and return it
CREATE OR REPLACE FUNCTION create_withdrawal_verification_code(
  p_withdrawal_request_id uuid,
  p_approver_email text,
  p_approver_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_code_id uuid;
  v_expires_at timestamptz;
BEGIN
  v_code := generate_verification_code();
  v_expires_at := now() + interval '5 minutes';
  
  INSERT INTO withdrawal_verification_codes (
    withdrawal_request_id,
    approver_email,
    approver_phone,
    verification_code,
    code_expires_at
  ) VALUES (
    p_withdrawal_request_id,
    p_approver_email,
    p_approver_phone,
    v_code,
    v_expires_at
  )
  RETURNING id INTO v_code_id;
  
  INSERT INTO withdrawal_approval_logs (
    withdrawal_request_id,
    approver_email,
    action,
    verification_method
  ) VALUES (
    p_withdrawal_request_id,
    p_approver_email,
    'verification_sent',
    'sms'
  );
  
  RETURN jsonb_build_object(
    'code_id', v_code_id,
    'code', v_code,
    'phone', p_approver_phone,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function to verify code
CREATE OR REPLACE FUNCTION verify_withdrawal_code(
  p_code_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_valid boolean;
  v_attempts_remaining integer;
BEGIN
  SELECT * INTO v_record
  FROM withdrawal_verification_codes
  WHERE id = p_code_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;
  
  IF v_record.verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code already used');
  END IF;
  
  IF v_record.attempts >= v_record.max_attempts THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum attempts exceeded');
  END IF;
  
  IF v_record.code_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code expired');
  END IF;
  
  UPDATE withdrawal_verification_codes
  SET attempts = attempts + 1
  WHERE id = p_code_id;
  
  v_valid := v_record.verification_code = p_code;
  
  IF v_valid THEN
    UPDATE withdrawal_verification_codes
    SET verified = true, verified_at = now()
    WHERE id = p_code_id;
    
    INSERT INTO withdrawal_approval_logs (
      withdrawal_request_id,
      approver_email,
      action,
      verification_method
    ) VALUES (
      v_record.withdrawal_request_id,
      v_record.approver_email,
      'verification_success',
      'sms'
    );
    
    RETURN jsonb_build_object('success', true);
  ELSE
    v_attempts_remaining := v_record.max_attempts - (v_record.attempts + 1);
    
    INSERT INTO withdrawal_approval_logs (
      withdrawal_request_id,
      approver_email,
      action,
      verification_method,
      details
    ) VALUES (
      v_record.withdrawal_request_id,
      v_record.approver_email,
      'verification_failed',
      'sms',
      jsonb_build_object('attempts', v_record.attempts + 1)
    );
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid code',
      'attempts_remaining', v_attempts_remaining
    );
  END IF;
END;
$$;

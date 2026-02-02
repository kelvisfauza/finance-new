/*
  # Seed Verification Demo Data

  1. Demo Records
    - Employee ID verification for Musema Wycliff
    - Document verification for Bwambale Morjalia salary letter
  
  2. Notes
    - Uses a system user UUID for created_by
    - Sets appropriate dates and metadata
*/

-- Insert demo employee verification
INSERT INTO verifications (
  code,
  type,
  subtype,
  status,
  issued_to_name,
  employee_no,
  position,
  department,
  workstation,
  issued_at,
  valid_until,
  meta,
  created_at
) VALUES (
  'GPCF-TRD-0001',
  'employee_id',
  'Employee ID Card',
  'verified',
  'Musema Wycliff',
  'GPCF-TRD-0001',
  'Assistant Trade Manager',
  'Trade Department',
  'Head Office',
  '2025-01-15 08:00:00+00',
  '2026-12-31 23:59:59+00',
  '{"employment_type": "Full Time", "hire_date": "2024-03-01"}'::jsonb,
  now()
) ON CONFLICT (code) DO NOTHING;

-- Insert demo document verification
INSERT INTO verifications (
  code,
  type,
  subtype,
  status,
  issued_to_name,
  employee_no,
  reference_no,
  department,
  issued_at,
  meta,
  created_at
) VALUES (
  'GPCF-HR-2026-000018',
  'document',
  'Salary Adjustment Letter',
  'verified',
  'Bwambale Morjalia',
  'GPC005',
  'HR/SAL/2026/18',
  'Human Resources',
  '2026-01-20 09:00:00+00',
  '{"document_type": "Official Letter", "subject": "Salary Adjustment Notification"}'::jsonb,
  now()
) ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- Great Pearl Coffee Factory - Verification System SQL Examples
-- =====================================================================
-- These are example SQL queries you can use from your other systems
-- to interact with the verification database
-- =====================================================================

-- =====================================================================
-- 1. INSERT OPERATIONS - Creating Verifications
-- =====================================================================

-- Example 1.1: Create an Employee ID verification
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
    meta
) VALUES (
    'GPCF-TRD-0050',                    -- Unique verification code
    'employee_id',                      -- Type: employee_id or document
    'Employee ID Card',                 -- Description
    'verified',                         -- Status: verified, expired, or revoked
    'John Doe',                         -- Full name
    'GPC050',                           -- Employee number
    'Trade Officer',                    -- Position
    'Trade Department',                 -- Department
    'Head Office',                      -- Workstation
    NOW(),                              -- Issue date
    NOW() + INTERVAL '2 years',         -- Valid for 2 years
    '{"blood_group": "A+", "emergency_contact": "+256 700 000 000"}'::jsonb
);

-- Example 1.2: Create a Document verification
INSERT INTO verifications (
    code,
    type,
    subtype,
    status,
    issued_to_name,
    employee_no,
    department,
    position,
    reference_no,
    issued_at,
    meta
) VALUES (
    'GPCF-HR-2026-000075',
    'document',
    'Salary Letter',
    'verified',
    'Jane Smith',
    'GPC075',
    'Finance Department',
    'Accountant',
    'HR/2026/SAL/075',
    NOW(),
    '{"salary_amount": 2500000, "currency": "UGX", "effective_date": "2026-02-01"}'::jsonb
);

-- Example 1.3: Batch insert multiple verifications
INSERT INTO verifications (code, type, subtype, status, issued_to_name, employee_no, department, issued_at)
VALUES
    ('GPCF-BATCH-001', 'document', 'Training Certificate', 'verified', 'Alice Johnson', 'GPC101', 'Operations', NOW()),
    ('GPCF-BATCH-002', 'document', 'Training Certificate', 'verified', 'Bob Wilson', 'GPC102', 'Operations', NOW()),
    ('GPCF-BATCH-003', 'document', 'Training Certificate', 'verified', 'Carol Brown', 'GPC103', 'Operations', NOW())
RETURNING id, code, issued_to_name;

-- =====================================================================
-- 2. SELECT OPERATIONS - Querying Verifications
-- =====================================================================

-- Example 2.1: Find a verification by code
SELECT *
FROM verifications
WHERE code = 'GPCF-TRD-0001';

-- Example 2.2: Get all verifications for an employee
SELECT
    code,
    type,
    subtype,
    status,
    issued_at,
    valid_until,
    reference_no
FROM verifications
WHERE employee_no = 'GPC005'
ORDER BY issued_at DESC;

-- Example 2.3: Get all active (verified) employee IDs
SELECT
    code,
    issued_to_name,
    employee_no,
    department,
    position,
    issued_at,
    valid_until
FROM verifications
WHERE type = 'employee_id'
  AND status = 'verified'
ORDER BY issued_at DESC;

-- Example 2.4: Get all documents of a specific type
SELECT
    code,
    issued_to_name,
    employee_no,
    department,
    reference_no,
    issued_at
FROM verifications
WHERE type = 'document'
  AND subtype = 'Salary Letter'
  AND status = 'verified'
ORDER BY issued_at DESC;

-- Example 2.5: Get verifications expiring in the next 30 days
SELECT
    code,
    issued_to_name,
    employee_no,
    department,
    valid_until,
    EXTRACT(DAY FROM (valid_until - NOW())) as days_until_expiry
FROM verifications
WHERE status = 'verified'
  AND valid_until IS NOT NULL
  AND valid_until <= NOW() + INTERVAL '30 days'
  AND valid_until >= NOW()
ORDER BY valid_until ASC;

-- Example 2.6: Get all verifications by department
SELECT
    code,
    type,
    subtype,
    issued_to_name,
    employee_no,
    status,
    issued_at
FROM verifications
WHERE department = 'Trade Department'
ORDER BY issued_at DESC;

-- Example 2.7: Check if a code already exists (before inserting)
SELECT EXISTS (
    SELECT 1
    FROM verifications
    WHERE code = 'GPCF-TRD-0001'
) as code_exists;

-- Example 2.8: Get verification statistics by department
SELECT
    department,
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE type = 'employee_id') as employee_ids,
    COUNT(*) FILTER (WHERE type = 'document') as documents,
    COUNT(*) FILTER (WHERE status = 'verified') as active,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM verifications
GROUP BY department
ORDER BY total_verifications DESC;

-- Example 2.9: Get recent verifications (last 7 days)
SELECT
    code,
    type,
    subtype,
    issued_to_name,
    department,
    created_at
FROM verifications
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Example 2.10: Search verifications by name (case-insensitive)
SELECT
    code,
    issued_to_name,
    employee_no,
    type,
    subtype,
    department,
    status
FROM verifications
WHERE LOWER(issued_to_name) LIKE LOWER('%john%')
ORDER BY issued_to_name;

-- =====================================================================
-- 3. UPDATE OPERATIONS - Modifying Verifications
-- =====================================================================

-- Example 3.1: Revoke a verification
UPDATE verifications
SET
    status = 'revoked',
    revoked_reason = 'Employee ID card lost - replacement issued'
WHERE code = 'GPCF-TRD-0050'
RETURNING *;

-- Example 3.2: Extend expiration date
UPDATE verifications
SET valid_until = NOW() + INTERVAL '1 year'
WHERE code = 'GPCF-TRD-0001'
RETURNING code, valid_until;

-- Example 3.3: Update employee information
UPDATE verifications
SET
    position = 'Senior Trade Officer',
    department = 'Trade Department',
    meta = meta || '{"promotion_date": "2026-02-01"}'::jsonb
WHERE employee_no = 'GPC050'
  AND type = 'employee_id'
RETURNING code, issued_to_name, position;

-- Example 3.4: Mark expired verifications as expired
UPDATE verifications
SET status = 'expired'
WHERE valid_until < NOW()
  AND status = 'verified'
RETURNING code, issued_to_name, valid_until;

-- Example 3.5: Update multiple verifications by department
UPDATE verifications
SET workstation = 'Kampala Branch'
WHERE department = 'Trade Department'
  AND workstation = 'Head Office'
RETURNING code, issued_to_name, workstation;

-- =====================================================================
-- 4. AUDIT LOG OPERATIONS
-- =====================================================================

-- Example 4.1: Create an audit log entry
INSERT INTO verification_audit_logs (
    action,
    code,
    admin_email,
    details
) VALUES (
    'create',
    'GPCF-TRD-0050',
    'admin@greatpearlcoffee.com',
    '{"type": "employee_id", "department": "Trade Department"}'::jsonb
);

-- Example 4.2: Get audit history for a specific verification
SELECT
    action,
    admin_email,
    timestamp,
    details
FROM verification_audit_logs
WHERE code = 'GPCF-TRD-0001'
ORDER BY timestamp DESC;

-- Example 4.3: Get all audit logs from the last 24 hours
SELECT
    action,
    code,
    admin_email,
    timestamp,
    details
FROM verification_audit_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Example 4.4: Count actions by type
SELECT
    action,
    COUNT(*) as total_actions,
    COUNT(DISTINCT code) as unique_verifications
FROM verification_audit_logs
GROUP BY action
ORDER BY total_actions DESC;

-- =====================================================================
-- 5. ADVANCED QUERIES
-- =====================================================================

-- Example 5.1: Get verifications with their audit trail
SELECT
    v.code,
    v.issued_to_name,
    v.status,
    v.created_at,
    jsonb_agg(
        jsonb_build_object(
            'action', a.action,
            'admin', a.admin_email,
            'timestamp', a.timestamp
        ) ORDER BY a.timestamp DESC
    ) as audit_trail
FROM verifications v
LEFT JOIN verification_audit_logs a ON v.code = a.code
WHERE v.employee_no = 'GPC005'
GROUP BY v.id, v.code, v.issued_to_name, v.status, v.created_at
ORDER BY v.created_at DESC;

-- Example 5.2: Find duplicate employee IDs (same employee with multiple IDs)
SELECT
    employee_no,
    issued_to_name,
    COUNT(*) as id_count,
    array_agg(code) as codes,
    array_agg(status) as statuses
FROM verifications
WHERE type = 'employee_id'
  AND employee_no IS NOT NULL
GROUP BY employee_no, issued_to_name
HAVING COUNT(*) > 1
ORDER BY id_count DESC;

-- Example 5.3: Get monthly verification creation statistics
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_created,
    COUNT(*) FILTER (WHERE type = 'employee_id') as employee_ids,
    COUNT(*) FILTER (WHERE type = 'document') as documents
FROM verifications
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Example 5.4: Find verifications without employee numbers
SELECT
    code,
    type,
    subtype,
    issued_to_name,
    department
FROM verifications
WHERE employee_no IS NULL OR employee_no = ''
ORDER BY created_at DESC;

-- Example 5.5: Get verification details with QR code URL
SELECT
    code,
    issued_to_name,
    type,
    subtype,
    status,
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' ||
    encode(('https://yourdomain.com/verify/' || code)::bytea, 'escape') as qr_code_url
FROM verifications
WHERE employee_no = 'GPC005'
ORDER BY issued_at DESC;

-- =====================================================================
-- 6. MAINTENANCE QUERIES
-- =====================================================================

-- Example 6.1: Get table statistics
SELECT
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE status = 'verified') as verified,
    COUNT(*) FILTER (WHERE status = 'expired') as expired,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked,
    COUNT(*) FILTER (WHERE type = 'employee_id') as employee_ids,
    COUNT(*) FILTER (WHERE type = 'document') as documents,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM verifications;

-- Example 6.2: Find verifications with missing required data
SELECT
    code,
    issued_to_name,
    type,
    CASE
        WHEN department IS NULL OR department = '' THEN 'Missing department'
        WHEN type = 'employee_id' AND position IS NULL THEN 'Missing position'
        WHEN type = 'document' AND reference_no IS NULL THEN 'Missing reference number'
        ELSE 'OK'
    END as data_issue
FROM verifications
WHERE
    (department IS NULL OR department = '')
    OR (type = 'employee_id' AND position IS NULL)
    OR (type = 'document' AND reference_no IS NULL);

-- Example 6.3: Clean up test data (be careful with this!)
-- DELETE FROM verifications WHERE code LIKE 'TEST-%';
-- DELETE FROM verifications WHERE meta->>'test_data' = 'true';

-- =====================================================================
-- 7. INTEGRATION PATTERNS
-- =====================================================================

-- Example 7.1: Upsert pattern (insert or update)
INSERT INTO verifications (
    code,
    type,
    subtype,
    status,
    issued_to_name,
    employee_no,
    department,
    issued_at
) VALUES (
    'GPCF-TRD-0099',
    'employee_id',
    'Employee ID Card',
    'verified',
    'Test User',
    'GPC099',
    'Test Department',
    NOW()
)
ON CONFLICT (code)
DO UPDATE SET
    issued_to_name = EXCLUDED.issued_to_name,
    department = EXCLUDED.department,
    updated_at = NOW()
RETURNING *;

-- Example 7.2: Get or create pattern
WITH inserted AS (
    INSERT INTO verifications (
        code, type, subtype, status, issued_to_name, employee_no, department, issued_at
    )
    VALUES (
        'GPCF-TEST-001', 'document', 'Test Doc', 'verified', 'Test User', 'TEST001', 'Test Dept', NOW()
    )
    ON CONFLICT (code) DO NOTHING
    RETURNING *
)
SELECT * FROM inserted
UNION ALL
SELECT * FROM verifications WHERE code = 'GPCF-TEST-001' AND NOT EXISTS (SELECT 1 FROM inserted);

-- Example 7.3: Bulk update with temporary table
-- CREATE TEMP TABLE temp_updates (code text, new_department text);
-- INSERT INTO temp_updates VALUES
--     ('GPCF-TRD-0001', 'New Department'),
--     ('GPCF-TRD-0002', 'New Department');
-- UPDATE verifications v
-- SET department = t.new_department
-- FROM temp_updates t
-- WHERE v.code = t.code;

-- =====================================================================
-- Notes:
-- - Always use parameterized queries in your application code
-- - Replace 'yourdomain.com' with your actual domain
-- - Test queries on staging/development environment first
-- - Always backup before running UPDATE or DELETE operations
-- - Use transactions for multiple related operations
-- =====================================================================

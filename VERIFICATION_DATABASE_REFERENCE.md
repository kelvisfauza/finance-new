# Verification Database Quick Reference

## 🗄️ Database Location

**Platform:** Supabase (PostgreSQL)

**Connection URL:** `https://pudfybkyfedeggmokhco.supabase.co`

**Project ID:** `pudfybkyfedeggmokhco`

## 📋 Tables

### Main Table: `verifications`

This is where ALL verification data is stored.

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERIFICATIONS TABLE                       │
├─────────────────────┬──────────────┬─────────────┬──────────────┤
│ Column              │ Type         │ Required    │ Example      │
├─────────────────────┼──────────────┼─────────────┼──────────────┤
│ id                  │ uuid         │ Auto        │ (generated)  │
│ code                │ text         │ ✅ YES      │ GPCF-TRD-001 │
│ type                │ text         │ ✅ YES      │ employee_id  │
│ subtype             │ text         │ ✅ YES      │ ID Card      │
│ status              │ text         │ ✅ YES      │ verified     │
│ issued_to_name      │ text         │ ✅ YES      │ John Doe     │
│ employee_no         │ text         │ No          │ GPC001       │
│ position            │ text         │ No          │ Manager      │
│ department          │ text         │ No          │ Trade Dept   │
│ workstation         │ text         │ No          │ Head Office  │
│ photo_url           │ text         │ No          │ (URL)        │
│ issued_at           │ timestamptz  │ Auto        │ 2026-02-02   │
│ valid_until         │ timestamptz  │ No          │ 2027-12-31   │
│ reference_no        │ text         │ No          │ HR/2026/001  │
│ file_url            │ text         │ No          │ (URL)        │
│ access_pin_hash     │ text         │ No          │ (hashed)     │
│ meta                │ jsonb        │ No          │ {...}        │
│ revoked_reason      │ text         │ No          │ (if revoked) │
│ created_by          │ uuid         │ No          │ (user UUID)  │
│ created_at          │ timestamptz  │ Auto        │ (timestamp)  │
│ updated_at          │ timestamptz  │ Auto        │ (timestamp)  │
└─────────────────────┴──────────────┴─────────────┴──────────────┘
```

### Audit Table: `verification_audit_logs`

Tracks all changes to verifications.

```
┌──────────────────────────────────────────────────────────────────┐
│                  VERIFICATION_AUDIT_LOGS TABLE                   │
├─────────────────────┬──────────────┬─────────────┬──────────────┤
│ Column              │ Type         │ Required    │ Example      │
├─────────────────────┼──────────────┼─────────────┼──────────────┤
│ id                  │ uuid         │ Auto        │ (generated)  │
│ action              │ text         │ ✅ YES      │ create       │
│ code                │ text         │ ✅ YES      │ GPCF-TRD-001 │
│ admin_user          │ uuid         │ No          │ (user UUID)  │
│ admin_email         │ text         │ ✅ YES      │ admin@...    │
│ timestamp           │ timestamptz  │ Auto        │ (timestamp)  │
│ details             │ jsonb        │ No          │ {...}        │
└─────────────────────┴──────────────┴─────────────┴──────────────┘
```

## 🔑 Access Keys

### Public (Anon) Key
**Use for:** Public verification lookups (reading data)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk
```

### Service Role Key
**Use for:** Creating/updating verifications (admin operations)

⚠️ **Get this from:** Supabase Dashboard > Settings > API > service_role key

**NEVER expose in frontend code!**

## 🎯 Quick Integration Steps

### Step 1: Install Client Library

```bash
npm install @supabase/supabase-js
```

### Step 2: Initialize Connection

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://pudfybkyfedeggmokhco.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
)
```

### Step 3: Insert a Verification

```javascript
const { data, error } = await supabase
  .from('verifications')
  .insert({
    code: 'GPCF-HR-2026-000050',
    type: 'document',
    subtype: 'Salary Letter',
    status: 'verified',
    issued_to_name: 'John Doe',
    employee_no: 'GPC001',
    department: 'Trade Department',
    issued_at: new Date().toISOString()
  })
  .select()
  .single()
```

### Step 4: User Verifies

User visits: `https://yourdomain.com/verify/GPCF-HR-2026-000050`

OR scans QR code that contains the verification code

## 📱 QR Code Generation

### Generate QR Code URL

```javascript
const code = 'GPCF-HR-2026-000050'
const verifyUrl = `https://yourdomain.com/verify/${code}`
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`
```

### Result

```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fyourdomain.com%2Fverify%2FGPCF-HR-2026-000050
```

## 🔍 Common Queries

### Check if code exists

```sql
SELECT * FROM verifications WHERE code = 'GPCF-TRD-0001';
```

```javascript
const { data } = await supabase
  .from('verifications')
  .select('*')
  .eq('code', 'GPCF-TRD-0001')
  .maybeSingle()
```

### Get all verifications for employee

```sql
SELECT * FROM verifications
WHERE employee_no = 'GPC001'
ORDER BY issued_at DESC;
```

```javascript
const { data } = await supabase
  .from('verifications')
  .select('*')
  .eq('employee_no', 'GPC001')
  .order('issued_at', { ascending: false })
```

### Get expiring verifications

```sql
SELECT * FROM verifications
WHERE status = 'verified'
  AND valid_until IS NOT NULL
  AND valid_until <= NOW() + INTERVAL '30 days'
  AND valid_until >= NOW()
ORDER BY valid_until ASC;
```

### Revoke a verification

```sql
UPDATE verifications
SET status = 'revoked',
    revoked_reason = 'Card lost'
WHERE code = 'GPCF-TRD-0001';
```

```javascript
await supabase
  .from('verifications')
  .update({
    status: 'revoked',
    revoked_reason: 'Card lost'
  })
  .eq('code', 'GPCF-TRD-0001')
```

## 📊 Data Types Reference

### `type` field - Must be one of:
- `employee_id` - For employee ID cards
- `document` - For documents

### `status` field - Must be one of:
- `verified` - Active and valid
- `expired` - Past expiration date
- `revoked` - Manually revoked

### `subtype` field - Examples:
- `Employee ID Card`
- `Salary Letter`
- `Employment Contract`
- `Training Certificate`
- `Transfer Letter`
- `Leave Approval`
- `Promotion Letter`

### `workstation` field - Examples:
- `Head Office`
- `Field`
- `Kampala Branch`
- `Mbarara Branch`

## 🛠️ REST API Endpoints

### Insert Verification

```
POST https://pudfybkyfedeggmokhco.supabase.co/rest/v1/verifications
Headers:
  apikey: YOUR_SERVICE_ROLE_KEY
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  Prefer: return=representation

Body: {
  "code": "GPCF-HR-2026-000051",
  "type": "document",
  "subtype": "Salary Letter",
  "status": "verified",
  "issued_to_name": "Jane Doe",
  "employee_no": "GPC002",
  "department": "Finance",
  "issued_at": "2026-02-02T00:00:00Z"
}
```

### Query Verification

```
GET https://pudfybkyfedeggmokhco.supabase.co/rest/v1/verifications?code=eq.GPCF-TRD-0001
Headers:
  apikey: YOUR_ANON_KEY
  Authorization: Bearer YOUR_ANON_KEY
```

### Update Verification

```
PATCH https://pudfybkyfedeggmokhco.supabase.co/rest/v1/verifications?code=eq.GPCF-TRD-0001
Headers:
  apikey: YOUR_SERVICE_ROLE_KEY
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  Prefer: return=representation

Body: {
  "status": "revoked",
  "revoked_reason": "Employee terminated"
}
```

## 🔐 Security & Permissions

### Public Access (RLS Enabled)
- ✅ Anyone can READ verifications (for verification page)
- ❌ Cannot CREATE without authentication
- ❌ Cannot UPDATE without authentication
- ❌ Cannot DELETE at all

### Authenticated Access
- ✅ Can CREATE verifications
- ✅ Can UPDATE verifications
- ✅ Can READ audit logs
- ❌ Cannot DELETE verifications (permanent record)

## 📝 Field Length Limits

- `code`: Recommended 20 characters max
- `subtype`: 100 characters max
- `issued_to_name`: 200 characters max
- `employee_no`: 50 characters max
- `department`: 100 characters max
- `position`: 100 characters max
- `reference_no`: 100 characters max

## 💡 Best Practices

1. **Unique Codes**: Always check if code exists before inserting
2. **Consistent Format**: Use same prefix pattern (e.g., GPCF-DEPT-XXXX)
3. **Set Expiry**: Add `valid_until` for employee IDs (typically 1-2 years)
4. **Use Metadata**: Store extra info in `meta` field as JSON
5. **Audit Trail**: Create audit log entries for important changes
6. **Error Handling**: Always check for errors after operations
7. **Validation**: Validate data before inserting
8. **Security**: Never expose service role key in frontend

## 📞 Support

- **Documentation**: See `VERIFICATION_API_INTEGRATION.md` for detailed examples
- **Examples**: See `examples/create-verification-example.js` for code samples
- **Email**: info@greatpearlcoffee.com
- **Tel**: +256 781 121 639

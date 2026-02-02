# 🚀 Verification System Integration - Quick Start Guide

## What You Need to Know

Your verification data is stored in **Supabase** (PostgreSQL database) in a table called **`verifications`**.

Any system can insert records into this table, and users can verify them by scanning QR codes or entering codes at: `https://yourdomain.com/verify`

## 📍 Database Location

```
Database: Supabase PostgreSQL
URL: https://pudfybkyfedeggmokhco.supabase.co
Table: verifications
```

## ⚡ 5-Minute Integration

### Option 1: Using JavaScript/Node.js

**1. Install the library:**
```bash
npm install @supabase/supabase-js
```

**2. Copy this code:**
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://pudfybkyfedeggmokhco.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'  // Get from Supabase Dashboard
)

// Create a verification
async function createVerification(data) {
  const { data: result, error } = await supabase
    .from('verifications')
    .insert({
      code: data.code,                    // Required: e.g., 'GPCF-HR-2026-001'
      type: data.type,                    // Required: 'employee_id' or 'document'
      subtype: data.subtype,              // Required: e.g., 'Salary Letter'
      status: 'verified',                 // Required: 'verified'
      issued_to_name: data.name,          // Required: Full name
      employee_no: data.employeeNo,       // Optional
      department: data.department,        // Optional
      position: data.position,            // Optional
      reference_no: data.referenceNo,     // Optional
      issued_at: new Date().toISOString(),
      valid_until: data.validUntil,       // Optional
      meta: data.meta || {}               // Optional: JSON object
    })
    .select()
    .single()

  if (error) {
    console.error('Error:', error)
    return null
  }

  console.log('✅ Created:', result.code)
  return result
}

// Example usage
createVerification({
  code: 'GPCF-HR-2026-000100',
  type: 'document',
  subtype: 'Salary Letter',
  name: 'John Doe',
  employeeNo: 'GPC100',
  department: 'Finance',
  position: 'Accountant',
  referenceNo: 'HR/2026/SAL/100'
})
```

### Option 2: Using Direct SQL

If your system has database access:

```sql
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
  'GPCF-HR-2026-000100',
  'document',
  'Salary Letter',
  'verified',
  'John Doe',
  'GPC100',
  'Finance Department',
  NOW()
);
```

### Option 3: Using REST API (Any Language)

```bash
curl -X POST 'https://pudfybkyfedeggmokhco.supabase.co/rest/v1/verifications' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "code": "GPCF-HR-2026-000100",
    "type": "document",
    "subtype": "Salary Letter",
    "status": "verified",
    "issued_to_name": "John Doe",
    "employee_no": "GPC100",
    "department": "Finance",
    "issued_at": "2026-02-02T00:00:00Z"
  }'
```

## 🔑 Get Your Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `pudfybkyfedeggmokhco`
3. Go to **Settings** > **API**
4. Copy the **service_role** key (not the anon key!)
5. **⚠️ IMPORTANT:** Never expose this key in frontend code!

## 📋 Required Fields

| Field | Required | Example |
|-------|----------|---------|
| `code` | ✅ Yes | `GPCF-HR-2026-001` |
| `type` | ✅ Yes | `employee_id` or `document` |
| `subtype` | ✅ Yes | `Salary Letter` |
| `status` | ✅ Yes | `verified` (always use this) |
| `issued_to_name` | ✅ Yes | `John Doe` |
| `employee_no` | No | `GPC001` |
| `department` | No | `Finance` |
| `position` | No | `Manager` |
| `reference_no` | No | `HR/2026/001` |
| `issued_at` | Auto | Current timestamp |
| `valid_until` | No | `2027-12-31` |

## 📱 Generate QR Codes

After creating a verification, generate a QR code:

```javascript
const code = 'GPCF-HR-2026-000100'
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://yourdomain.com/verify/${code}`

console.log('QR Code URL:', qrUrl)
// Download and print this QR code on your document
```

Or in Python:
```python
code = 'GPCF-HR-2026-000100'
qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://yourdomain.com/verify/{code}"
print(f"QR Code URL: {qr_url}")
```

## 🔍 How Users Verify

Users have 3 options:

1. **Scan QR Code** (Recommended)
   - Visit `https://yourdomain.com/verify`
   - Click "Scan QR Code"
   - Point camera at QR code
   - Instant verification results!

2. **Manual Entry**
   - Visit `https://yourdomain.com/verify`
   - Type the verification code
   - Click "Verify Now"

3. **Direct URL**
   - Visit `https://yourdomain.com/verify/GPCF-HR-2026-000100`
   - Instant results

## ✅ Testing Your Integration

### Step 1: Create a test verification
```javascript
await createVerification({
  code: 'TEST-' + Date.now(),
  type: 'document',
  subtype: 'Test Document',
  name: 'Test User',
  employeeNo: 'TEST001',
  department: 'Test Department'
})
```

### Step 2: Verify it works
1. Go to `https://yourdomain.com/verify`
2. Enter your test code
3. Confirm the data appears correctly

### Step 3: Clean up
```javascript
await supabase
  .from('verifications')
  .delete()
  .eq('code', 'TEST-1234567890')
```

## 🎯 Common Use Cases

### Use Case 1: HR System Creating Salary Letters

When your HR system prints a salary letter:

```javascript
// 1. Generate unique code
const code = `GPCF-HR-${year}-${sequentialNumber}`

// 2. Create verification in database
const verification = await createVerification({
  code: code,
  type: 'document',
  subtype: 'Salary Letter',
  name: employee.name,
  employeeNo: employee.id,
  department: employee.department,
  referenceNo: `SAL/${year}/${employee.id}`
})

// 3. Generate QR code
const qrUrl = generateQRCode(code)

// 4. Add QR code to PDF
// 5. Print letter with QR code
```

### Use Case 2: Generating Employee ID Cards

When creating a new employee ID:

```javascript
// 1. Create verification
const verification = await createVerification({
  code: `GPCF-EMP-${deptCode}-${empNumber}`,
  type: 'employee_id',
  subtype: 'Employee ID Card',
  name: employee.fullName,
  employeeNo: employee.number,
  department: employee.department,
  position: employee.position,
  workstation: 'Head Office',
  photo_url: employee.photoUrl,
  valid_until: twoYearsFromNow()
})

// 2. Print ID card with QR code
```

### Use Case 3: Batch Processing

Import multiple verifications at once:

```javascript
const verifications = employees.map(emp => ({
  code: `GPCF-EMP-${emp.id}`,
  type: 'employee_id',
  subtype: 'Employee ID Card',
  status: 'verified',
  issued_to_name: emp.name,
  employee_no: emp.number,
  department: emp.department,
  position: emp.position,
  issued_at: new Date().toISOString()
}))

const { data, error } = await supabase
  .from('verifications')
  .insert(verifications)
  .select()

console.log(`✅ Created ${data.length} verifications`)
```

## 📚 Additional Resources

- **Full API Documentation**: `VERIFICATION_API_INTEGRATION.md`
- **Database Reference**: `VERIFICATION_DATABASE_REFERENCE.md`
- **SQL Examples**: `examples/verification-queries.sql`
- **Code Examples**: `examples/create-verification-example.js`
- **User Guide**: `VERIFICATION_MODULE_README.md`

## ❓ Common Questions

### Q: Where do I get the service role key?
**A:** Supabase Dashboard > Settings > API > service_role key

### Q: Can I use the anon key instead?
**A:** No, the anon key only allows reading. Use service role key for creating verifications.

### Q: How do I ensure unique codes?
**A:** Check if code exists before inserting:
```javascript
const { data } = await supabase
  .from('verifications')
  .select('code')
  .eq('code', 'GPCF-HR-2026-001')
  .maybeSingle()

if (data) {
  console.log('Code already exists!')
} else {
  // Safe to insert
}
```

### Q: How do I revoke a verification?
**A:** Update the status and reason:
```javascript
await supabase
  .from('verifications')
  .update({
    status: 'revoked',
    revoked_reason: 'Employee terminated'
  })
  .eq('code', 'GPCF-EMP-001')
```

### Q: Can users scan codes from mobile phones?
**A:** Yes! The verification page has a built-in camera scanner that works on all devices.

### Q: How do I search for existing verifications?
**A:** Query by any field:
```javascript
// By employee number
const { data } = await supabase
  .from('verifications')
  .select('*')
  .eq('employee_no', 'GPC001')

// By department
const { data } = await supabase
  .from('verifications')
  .select('*')
  .eq('department', 'Finance')

// By name (partial match)
const { data } = await supabase
  .from('verifications')
  .select('*')
  .ilike('issued_to_name', '%john%')
```

## 🆘 Support

Need help?

- **Email:** info@greatpearlcoffee.com
- **Phone:** +256 781 121 639
- **Documentation:** See the files listed in Additional Resources above

## 🎉 You're Ready!

1. Get your service role key
2. Choose your integration method (JS, SQL, or REST API)
3. Create your first verification
4. Test it at `https://yourdomain.com/verify`
5. Add QR codes to your documents

That's it! Your system is now integrated with the verification system.

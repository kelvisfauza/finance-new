# Verification System API Integration Guide

This guide shows you how to integrate your other systems with the verification system so documents created elsewhere can be verified here.

## Database Location

All verification data is stored in **Supabase PostgreSQL** in the `verifications` table.

### Connection Details

Your Supabase connection details are in `.env`:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key (for public reads)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

## Table Structure

### `verifications` Table

```sql
CREATE TABLE verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,                      -- Verification code (e.g., GPCF-TRD-0001)
  type text NOT NULL,                             -- 'employee_id' or 'document'
  subtype text NOT NULL,                          -- Description (e.g., "Salary Letter")
  status text NOT NULL DEFAULT 'verified',        -- 'verified', 'expired', or 'revoked'
  issued_to_name text NOT NULL,                   -- Full name
  employee_no text,                               -- Employee number (optional)
  position text,                                  -- Job position (optional)
  department text,                                -- Department name (optional)
  workstation text,                               -- Work location (optional)
  photo_url text,                                 -- Photo URL for employee IDs (optional)
  issued_at timestamptz NOT NULL DEFAULT now(),   -- Issue date
  valid_until timestamptz,                        -- Expiration date (optional)
  reference_no text,                              -- Document reference number (optional)
  file_url text,                                  -- Document file URL (optional)
  access_pin_hash text,                           -- Hashed PIN (optional)
  meta jsonb DEFAULT '{}',                        -- Additional metadata (JSON)
  revoked_reason text,                            -- Reason if revoked (optional)
  created_by uuid,                                -- UUID of creating user
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Key Fields Explained

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `code` | ✅ Yes | Unique verification code | `GPCF-TRD-0001` |
| `type` | ✅ Yes | Must be `employee_id` or `document` | `document` |
| `subtype` | ✅ Yes | Description of the type | `Salary Letter` |
| `status` | ✅ Yes | Must be `verified`, `expired`, or `revoked` | `verified` |
| `issued_to_name` | ✅ Yes | Person's full name | `John Doe` |
| `employee_no` | No | Employee ID number | `GPC001` |
| `department` | No | Department name | `Trade Department` |
| `position` | No | Job title | `Manager` |
| `workstation` | No | Work location | `Head Office` |
| `issued_at` | ✅ Yes | When issued (auto-set if omitted) | `2026-01-15` |
| `valid_until` | No | Expiration date | `2027-12-31` |
| `reference_no` | No | Document reference | `HR/2026/0001` |
| `meta` | No | Extra data as JSON | `{"notes": "Approved"}` |

## Integration Methods

### Method 1: Direct SQL Insert (Recommended)

If your system has direct database access to Supabase:

```sql
INSERT INTO verifications (
  code,
  type,
  subtype,
  status,
  issued_to_name,
  employee_no,
  department,
  position,
  issued_at,
  valid_until,
  reference_no,
  meta
) VALUES (
  'GPCF-HR-2026-000025',           -- Unique code
  'document',                       -- Type
  'Employment Contract',            -- Subtype
  'verified',                       -- Status
  'Jane Smith',                     -- Name
  'GPC102',                         -- Employee number
  'HR Department',                  -- Department
  'HR Officer',                     -- Position
  NOW(),                            -- Issued at
  '2027-12-31'::timestamptz,       -- Valid until
  'HR/2026/CONTRACT/025',          -- Reference number
  '{"contract_type": "permanent"}'::jsonb  -- Metadata
);
```

### Method 2: Supabase REST API

Use Supabase's REST API from any programming language:

#### JavaScript/Node.js Example

```javascript
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'  // Use service role key for admin operations
)

// Create a new verification
async function createVerification() {
  const { data, error } = await supabase
    .from('verifications')
    .insert({
      code: 'GPCF-HR-2026-000026',
      type: 'document',
      subtype: 'Leave Approval',
      status: 'verified',
      issued_to_name: 'John Doe',
      employee_no: 'GPC001',
      department: 'Trade Department',
      position: 'Assistant Manager',
      issued_at: new Date().toISOString(),
      valid_until: '2026-12-31T23:59:59Z',
      reference_no: 'HR/2026/LEAVE/026',
      meta: {
        leave_type: 'annual',
        days: 14
      }
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating verification:', error)
    return null
  }

  console.log('Verification created:', data)
  return data
}
```

#### Python Example

```python
from supabase import create_client, Client
from datetime import datetime, timedelta

# Initialize Supabase client
url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
supabase: Client = create_client(url, key)

# Create a new verification
def create_verification():
    data = supabase.table('verifications').insert({
        "code": "GPCF-HR-2026-000027",
        "type": "document",
        "subtype": "Salary Increment Letter",
        "status": "verified",
        "issued_to_name": "Alice Johnson",
        "employee_no": "GPC203",
        "department": "Finance Department",
        "position": "Accountant",
        "issued_at": datetime.now().isoformat(),
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat(),
        "reference_no": "HR/2026/SAL/027",
        "meta": {
            "increment_percentage": 10,
            "effective_date": "2026-02-01"
        }
    }).execute()

    print("Verification created:", data)
    return data
```

#### PHP Example

```php
<?php
// Using Supabase REST API directly
function createVerification() {
    $supabaseUrl = 'YOUR_SUPABASE_URL';
    $serviceRoleKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

    $data = [
        'code' => 'GPCF-HR-2026-000028',
        'type' => 'document',
        'subtype' => 'Training Certificate',
        'status' => 'verified',
        'issued_to_name' => 'Bob Wilson',
        'employee_no' => 'GPC304',
        'department' => 'Operations',
        'position' => 'Supervisor',
        'issued_at' => date('c'),
        'valid_until' => date('c', strtotime('+2 years')),
        'reference_no' => 'TRN/2026/028',
        'meta' => json_encode([
            'training_type' => 'Safety & Quality',
            'duration_days' => 5
        ])
    ];

    $ch = curl_init($supabaseUrl . '/rest/v1/verifications');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $serviceRoleKey,
        'Authorization: Bearer ' . $serviceRoleKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}
```

### Method 3: cURL (Command Line)

```bash
curl -X POST 'YOUR_SUPABASE_URL/rest/v1/verifications' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "code": "GPCF-HR-2026-000029",
    "type": "document",
    "subtype": "Transfer Letter",
    "status": "verified",
    "issued_to_name": "Sarah Miller",
    "employee_no": "GPC405",
    "department": "Marketing",
    "position": "Marketing Officer",
    "issued_at": "2026-02-02T00:00:00Z",
    "valid_until": "2027-02-02T00:00:00Z",
    "reference_no": "HR/2026/TRF/029",
    "meta": {
      "transfer_from": "Kampala Office",
      "transfer_to": "Mbarara Branch"
    }
  }'
```

## Verification Code Best Practices

### Code Format Guidelines

1. **Use consistent prefixes**
   - `GPCF-TRD-XXXX` - Trade Department
   - `GPCF-HR-YYYY-XXXX` - HR Documents (with year)
   - `GPCF-FIN-YYYY-XXXX` - Finance Documents
   - `GPCF-EMP-XXXX` - Employee IDs

2. **Make codes unique and sequential**
   ```
   GPCF-HR-2026-000001
   GPCF-HR-2026-000002
   GPCF-HR-2026-000003
   ```

3. **Use uppercase for consistency**

4. **Keep codes short but meaningful**

## Example Use Cases

### Use Case 1: HR System Creating Salary Letters

When your HR system generates a salary letter:

```javascript
async function createSalaryLetterVerification(employee) {
  const verificationCode = `GPCF-HR-${new Date().getFullYear()}-${generateSequentialNumber()}`

  const { data, error } = await supabase
    .from('verifications')
    .insert({
      code: verificationCode,
      type: 'document',
      subtype: 'Salary Letter',
      status: 'verified',
      issued_to_name: employee.fullName,
      employee_no: employee.employeeNo,
      department: employee.department,
      position: employee.position,
      reference_no: `SAL/${new Date().getFullYear()}/${employee.employeeNo}`,
      issued_at: new Date().toISOString(),
      meta: {
        salary_amount: employee.salary,
        currency: 'UGX',
        issued_by: 'HR Department'
      }
    })
    .select()
    .single()

  if (!error) {
    // Generate QR code for the document
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://yourdomain.com/verify/${verificationCode}`)}`

    // Add QR code to the salary letter PDF
    // Then send to employee
  }

  return { verificationCode, qrCodeUrl }
}
```

### Use Case 2: Generating Employee ID Cards

When creating a new employee ID:

```javascript
async function createEmployeeIDVerification(employee) {
  const verificationCode = `GPCF-EMP-${employee.department.substring(0, 3).toUpperCase()}-${String(employee.id).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('verifications')
    .insert({
      code: verificationCode,
      type: 'employee_id',
      subtype: 'Employee ID Card',
      status: 'verified',
      issued_to_name: employee.fullName,
      employee_no: employee.employeeNo,
      department: employee.department,
      position: employee.position,
      workstation: employee.workstation || 'Head Office',
      photo_url: employee.photoUrl,
      issued_at: new Date().toISOString(),
      valid_until: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
      meta: {
        blood_group: employee.bloodGroup,
        emergency_contact: employee.emergencyContact
      }
    })
    .select()
    .single()

  return { verificationCode }
}
```

### Use Case 3: Batch Import from Excel/CSV

```javascript
const XLSX = require('xlsx')

async function importVerificationsFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet)

  const verifications = rows.map(row => ({
    code: row.VerificationCode,
    type: row.Type,
    subtype: row.Subtype,
    status: 'verified',
    issued_to_name: row.Name,
    employee_no: row.EmployeeNo,
    department: row.Department,
    position: row.Position,
    issued_at: new Date(row.IssuedDate).toISOString(),
    valid_until: row.ValidUntil ? new Date(row.ValidUntil).toISOString() : null,
    reference_no: row.ReferenceNo,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'excel_import'
    }
  }))

  const { data, error } = await supabase
    .from('verifications')
    .insert(verifications)
    .select()

  if (error) {
    console.error('Import error:', error)
    return { success: false, error }
  }

  console.log(`Successfully imported ${data.length} verifications`)
  return { success: true, count: data.length }
}
```

## Querying Verifications

### Check if a code exists

```javascript
async function checkVerification(code) {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('Query error:', error)
    return null
  }

  return data
}
```

### Get all verifications for an employee

```javascript
async function getEmployeeVerifications(employeeNo) {
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('employee_no', employeeNo)
    .order('issued_at', { ascending: false })

  return data
}
```

### Get verifications expiring soon

```javascript
async function getExpiringVerifications(daysAhead = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('status', 'verified')
    .not('valid_until', 'is', null)
    .lte('valid_until', futureDate.toISOString())
    .gte('valid_until', new Date().toISOString())
    .order('valid_until', { ascending: true })

  return data
}
```

## Updating Verifications

### Revoke a verification

```javascript
async function revokeVerification(code, reason) {
  const { data, error } = await supabase
    .from('verifications')
    .update({
      status: 'revoked',
      revoked_reason: reason
    })
    .eq('code', code)
    .select()
    .single()

  if (!error) {
    // Create audit log
    await supabase
      .from('verification_audit_logs')
      .insert({
        action: 'revoke',
        code: code,
        admin_user: 'YOUR_USER_UUID',
        admin_email: 'admin@example.com',
        details: { reason }
      })
  }

  return { data, error }
}
```

## QR Code Generation

Generate QR codes that link to the verification page:

```javascript
function generateQRCodeURL(verificationCode) {
  const verifyUrl = `https://yourdomain.com/verify/${verificationCode}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verifyUrl)}`
  return qrCodeUrl
}

// Download QR code
async function downloadQRCode(verificationCode, filePath) {
  const qrUrl = generateQRCodeURL(verificationCode)
  const response = await fetch(qrUrl)
  const buffer = await response.arrayBuffer()

  require('fs').writeFileSync(filePath, Buffer.from(buffer))
  console.log(`QR code saved to ${filePath}`)
}
```

## Security Notes

1. **Use Service Role Key for Backend Operations**
   - NEVER expose the service role key in frontend code
   - Use it only in backend/server-side code

2. **Public Access**
   - The verification lookup page is public (anyone can verify codes)
   - This is by design - verifications should be publicly verifiable

3. **Authentication Required for Creating**
   - Only authenticated users can create verifications
   - Use proper authentication in your integration

4. **Data Validation**
   - Always validate data before inserting
   - Check for unique codes to avoid duplicates
   - Ensure required fields are present

## Testing Your Integration

1. **Create a test verification** from your system
2. **Visit** `https://yourdomain.com/verify`
3. **Scan or enter** the verification code
4. **Verify** the data displays correctly

## Support

For questions or issues:
- Email: info@greatpearlcoffee.com
- Tel: +256 781 121 639

## Example Integration Checklist

- [ ] Get Supabase connection details from `.env`
- [ ] Choose integration method (SQL, REST API, etc.)
- [ ] Implement verification creation in your system
- [ ] Add QR code generation to your documents
- [ ] Test with sample verifications
- [ ] Set up automated verification creation
- [ ] Configure error handling and logging
- [ ] Document your integration process
- [ ] Train staff on the verification system

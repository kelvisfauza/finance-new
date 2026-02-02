/**
 * Example Script: Create Verification from External System
 *
 * This script demonstrates how to create a verification in the system
 * from your other application (HR system, document management, etc.)
 *
 * Usage:
 *   1. Install dependencies: npm install @supabase/supabase-js
 *   2. Set your SUPABASE_SERVICE_ROLE_KEY in environment or replace below
 *   3. Run: node create-verification-example.js
 */

const { createClient } = require('@supabase/supabase-js')

// Your Supabase connection details
const SUPABASE_URL = 'https://pudfybkyfedeggmokhco.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE' // Get from Supabase Dashboard > Settings > API

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Example 1: Create an Employee ID verification
async function createEmployeeIDExample() {
  console.log('\n📋 Creating Employee ID verification...')

  const { data, error } = await supabase
    .from('verifications')
    .insert({
      code: 'GPCF-TRD-0099',                    // Unique verification code
      type: 'employee_id',                      // Type: employee_id
      subtype: 'Employee ID Card',              // Description
      status: 'verified',                       // Status: verified
      issued_to_name: 'Test Employee',          // Full name
      employee_no: 'GPC999',                    // Employee number
      department: 'Test Department',            // Department
      position: 'Test Officer',                 // Position
      workstation: 'Head Office',               // Work location
      issued_at: new Date().toISOString(),      // Issue date
      valid_until: new Date('2027-12-31').toISOString(), // Expiry date
      meta: {
        blood_group: 'O+',
        emergency_contact: '+256 700 000 000'
      }
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log('✅ Employee ID created successfully!')
  console.log('📝 Verification Code:', data.code)
  console.log('🔗 Verify at: https://yourdomain.com/verify/' + data.code)
  console.log('📱 QR Code: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent('https://yourdomain.com/verify/' + data.code))

  return data
}

// Example 2: Create a Document verification
async function createDocumentExample() {
  console.log('\n📄 Creating Document verification...')

  const currentYear = new Date().getFullYear()
  const sequentialNumber = String(Math.floor(Math.random() * 9999) + 1).padStart(6, '0')

  const { data, error } = await supabase
    .from('verifications')
    .insert({
      code: `GPCF-HR-${currentYear}-${sequentialNumber}`,
      type: 'document',
      subtype: 'Salary Letter',
      status: 'verified',
      issued_to_name: 'Test Employee 2',
      employee_no: 'GPC888',
      department: 'Finance Department',
      position: 'Accountant',
      reference_no: `SAL/${currentYear}/${sequentialNumber}`,
      issued_at: new Date().toISOString(),
      meta: {
        document_type: 'salary_letter',
        salary_amount: 2500000,
        currency: 'UGX',
        issued_by: 'HR Department'
      }
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log('✅ Document verification created successfully!')
  console.log('📝 Verification Code:', data.code)
  console.log('📋 Reference Number:', data.reference_no)
  console.log('🔗 Verify at: https://yourdomain.com/verify/' + data.code)

  return data
}

// Example 3: Check if a verification code exists
async function checkVerificationExists(code) {
  console.log(`\n🔍 Checking if code ${code} exists...`)

  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  if (data) {
    console.log('✅ Verification found!')
    console.log('👤 Issued to:', data.issued_to_name)
    console.log('📅 Status:', data.status)
    console.log('🏢 Department:', data.department)
  } else {
    console.log('⚠️ No verification found with this code')
  }

  return data
}

// Example 4: Get all verifications for an employee
async function getEmployeeVerifications(employeeNo) {
  console.log(`\n📊 Getting all verifications for employee ${employeeNo}...`)

  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('employee_no', employeeNo)
    .order('issued_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error.message)
    return []
  }

  console.log(`✅ Found ${data.length} verification(s)`)
  data.forEach((v, i) => {
    console.log(`\n  ${i + 1}. ${v.code}`)
    console.log(`     Type: ${v.subtype}`)
    console.log(`     Status: ${v.status}`)
    console.log(`     Issued: ${new Date(v.issued_at).toLocaleDateString()}`)
  })

  return data
}

// Example 5: Revoke a verification
async function revokeVerification(code, reason) {
  console.log(`\n🚫 Revoking verification ${code}...`)

  const { data, error } = await supabase
    .from('verifications')
    .update({
      status: 'revoked',
      revoked_reason: reason
    })
    .eq('code', code)
    .select()
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    return null
  }

  console.log('✅ Verification revoked successfully!')
  console.log('📝 Reason:', reason)

  // Optional: Create audit log
  await supabase
    .from('verification_audit_logs')
    .insert({
      action: 'revoke',
      code: code,
      admin_email: 'system@example.com',
      details: { reason }
    })

  return data
}

// Example 6: Batch create verifications
async function batchCreateVerifications(verifications) {
  console.log(`\n📦 Batch creating ${verifications.length} verifications...`)

  const { data, error } = await supabase
    .from('verifications')
    .insert(verifications)
    .select()

  if (error) {
    console.error('❌ Error:', error.message)
    return []
  }

  console.log(`✅ Successfully created ${data.length} verifications!`)
  return data
}

// Main execution
async function main() {
  console.log('🚀 Great Pearl Coffee Factory - Verification Integration Examples')
  console.log('=' .repeat(70))

  // Uncomment the examples you want to run:

  // Example 1: Create Employee ID
  // await createEmployeeIDExample()

  // Example 2: Create Document
  // await createDocumentExample()

  // Example 3: Check if code exists
  // await checkVerificationExists('GPCF-TRD-0001')

  // Example 4: Get all verifications for an employee
  // await getEmployeeVerifications('GPC005')

  // Example 5: Revoke a verification
  // await revokeVerification('GPCF-TEST-001', 'Test revocation')

  // Example 6: Batch create
  // const batchData = [
  //   {
  //     code: 'GPCF-BATCH-001',
  //     type: 'document',
  //     subtype: 'Transfer Letter',
  //     status: 'verified',
  //     issued_to_name: 'Batch Test 1',
  //     employee_no: 'GPC001',
  //     department: 'HR',
  //     issued_at: new Date().toISOString()
  //   },
  //   {
  //     code: 'GPCF-BATCH-002',
  //     type: 'document',
  //     subtype: 'Training Certificate',
  //     status: 'verified',
  //     issued_to_name: 'Batch Test 2',
  //     employee_no: 'GPC002',
  //     department: 'Operations',
  //     issued_at: new Date().toISOString()
  //   }
  // ]
  // await batchCreateVerifications(batchData)

  console.log('\n✅ All examples completed!')
  console.log('\n💡 Tips:')
  console.log('  - Uncomment the examples above to run them')
  console.log('  - Make sure to set your SUPABASE_SERVICE_ROLE_KEY')
  console.log('  - Use unique verification codes to avoid duplicates')
  console.log('  - Always validate data before inserting')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

// Export functions for use in other modules
module.exports = {
  createEmployeeIDExample,
  createDocumentExample,
  checkVerificationExists,
  getEmployeeVerifications,
  revokeVerification,
  batchCreateVerifications
}

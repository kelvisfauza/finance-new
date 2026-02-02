# Verification Module Documentation

## Overview

The Verification Module is a comprehensive system integrated into the Great Pearl Coffee Factory management system. It allows the company to issue, manage, and verify employee IDs and documents through QR codes and verification codes.

## Features

### Public Features
- **Verification Search Page** (`/verify`) - Anyone can search for a verification code
- **Verification Result Page** (`/verify/:code`) - Displays verification status and details
- **QR Code Scanning** - QR codes automatically redirect to verification results

### Admin Features (Protected)
- **Verification Management** (`/admin/verifications`) - Create, view, and manage verifications
- **Audit Logs** (`/admin/verifications/logs`) - Complete history of all verification actions
- **QR Code Generation** - Automatic QR code creation and download
- **Revocation System** - Revoke verifications with mandatory reason tracking

## Database Schema

### `verifications` Table
- `id` - Unique identifier
- `code` - Verification code (e.g., GPCF-TRD-0001)
- `type` - Either 'employee_id' or 'document'
- `subtype` - Description (e.g., "Employee ID Card", "Salary Letter")
- `status` - 'verified', 'expired', or 'revoked'
- `issued_to_name` - Full name of the person
- `employee_no` - Employee number (optional)
- `position` - Job position (for employee IDs)
- `department` - Department name
- `workstation` - Work location (e.g., "Head Office")
- `photo_url` - Photo URL for employee IDs
- `issued_at` - Issue date
- `valid_until` - Expiration date (optional)
- `reference_no` - Document reference number
- `file_url` - Document file URL (optional)
- `access_pin_hash` - Hashed PIN for document access (optional)
- `meta` - JSON metadata for additional information
- `revoked_reason` - Reason for revocation
- `created_by` - Admin who created the record
- `created_at` / `updated_at` - Timestamps

### `verification_audit_logs` Table
- `id` - Unique identifier
- `action` - 'create', 'update', or 'revoke'
- `code` - Verification code affected
- `admin_user` - Admin who performed the action
- `admin_email` - Admin email for display
- `timestamp` - When the action occurred
- `details` - JSON details about the action

## Routes

### Public Routes (No Authentication Required)
- `GET /verify` - Search page
- `GET /verify/:code` - Verification result page

### Protected Routes (Admin Only)
- `GET /admin/verifications` - Management interface
- `GET /admin/verifications/logs` - Audit log viewer

## Usage Guide

### For Administrators

#### Creating a Verification

1. Navigate to "Verifications" in the sidebar
2. Click "Create New" button
3. Fill in the form:
   - **Code**: Unique verification code (e.g., GPCF-TRD-0001)
   - **Type**: Select Employee ID or Document
   - **Subtype**: Description of the type
   - **Issued To Name**: Full name
   - **Employee Number**: Optional employee number
   - **Department**: Department name
   - **Position**: For employee IDs
   - **Work Station**: Location (Head Office, Field, Branch)
   - **Valid Until**: Optional expiration date
   - **Metadata**: Additional information in JSON format

4. Click "Create Verification"

#### Managing Verifications

- **View**: Click the external link icon to view the public verification page
- **Download QR Code**: Click the download icon to get the QR code as PNG
- **Revoke**: Click the ban icon to revoke a verification (requires reason)

#### Viewing Audit Logs

1. Navigate to "Verifications" in the sidebar
2. Click "View Audit Logs" link
3. Filter by action type (Create, Update, Revoke)
4. View complete history with admin details and timestamps

### For Public Users

#### Verifying a Code

1. Visit `/verify` on your domain
2. Enter the verification code from the document or ID card
3. Click "Verify Now"
4. View the verification results

#### Scanning QR Codes

1. Scan the QR code with any QR code reader
2. The QR code automatically opens the verification result page
3. View the verification status and details

## Verification Statuses

### ✅ VERIFIED (Green)
The verification is active and valid. All information can be trusted.

### ⏳ EXPIRED (Yellow)
The verification has passed its expiration date. Information may be outdated.

### ❌ REVOKED (Red)
The verification has been officially revoked. Shows the revocation reason.

### ⚠️ NOT FOUND (Gray)
The verification code does not exist in the system.

## Display Rules

### Employee ID Verifications Show:
- Photo (if available)
- Full name
- Employee number
- Position
- Department
- Work station
- Verification code
- Issue date
- Valid until date

### Document Verifications Show:
- Document type/subtype
- Reference number
- Issued to name
- Employee number (if applicable)
- Department
- Verification code
- Issue date
- Additional metadata

### Information NOT Shown (For Privacy):
- Date of birth
- National ID number
- Salary information
- Home address
- Personal contact information

## QR Code System

### QR Code Format
All QR codes point to: `https://YOURDOMAIN/verify/<CODE>`

Example:
- Employee: `https://yourdomain.com/verify/GPCF-TRD-0001`
- Document: `https://yourdomain.com/verify/GPCF-HR-2026-000018`

### QR Code Generation
- Automatically generated using QR Server API
- Size: 300x300 pixels
- Format: PNG
- Downloadable directly from admin interface

## Security Features

### Row Level Security (RLS)
- Public can only view verification results (read-only)
- Only authenticated admins can create/update/revoke verifications
- Audit logs are only accessible to authenticated users

### Audit Trail
- All actions are logged with:
  - Action type (create/update/revoke)
  - Admin who performed the action
  - Timestamp
  - Affected verification code
  - Additional details

### Revocation System
- Mandatory reason required for revocation
- Revoked verifications show clear warning
- Revocation reason displayed on public page
- Cannot be undone (permanent record)

## Demo Data

The system includes two demo records:

### Demo Employee ID
- **Code**: GPCF-TRD-0001
- **Name**: Musema Wycliff
- **Position**: Assistant Trade Manager
- **Department**: Trade Department
- **Status**: Verified
- **Valid Until**: December 31, 2026

### Demo Document
- **Code**: GPCF-HR-2026-000018
- **Type**: Salary Adjustment Letter
- **Name**: Bwambale Morjalia
- **Employee No**: GPC005
- **Status**: Verified

## Best Practices

### Code Format
- Use consistent prefixes (e.g., GPCF-TRD for Trade Department)
- Include year for documents (e.g., GPCF-HR-2026-000018)
- Keep codes short but meaningful
- Use uppercase for consistency

### Expiration Dates
- Set expiration dates for employee IDs (typically 1-2 years)
- Documents may not need expiration dates
- System automatically marks verifications as expired

### Metadata Usage
- Store additional information in JSON format
- Keep metadata organized and structured
- Use for non-critical supplementary information

### Revocation
- Always provide clear, detailed revocation reasons
- Revoke immediately if document is compromised
- Check verification status before trusting information

## Contact Information

Displayed on all verification pages:
- **Website**: www.greatpearlcoffee.com
- **Tel**: +256 781 121 639
- **Email**: info@greatpearlcoffee.com

## Technical Stack

- **Frontend**: React + TypeScript
- **Routing**: React Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **QR Codes**: QR Server API
- **Date Formatting**: date-fns

## Troubleshooting

### Verification Not Found
- Check that the code is entered correctly (case-sensitive)
- Verify the code exists in the admin panel
- Ensure there are no extra spaces

### QR Code Not Working
- Confirm QR code points to correct domain
- Test QR code with multiple scanners
- Re-download QR code if corrupted

### Access Denied
- Ensure user has admin privileges
- Check that user is logged in
- Verify role permissions in auth system

## Future Enhancements

Potential features for future development:
- Photo upload for employee IDs
- Document PDF attachment and access
- PIN-protected document downloads
- Bulk import/export functionality
- Email notifications on verification
- SMS verification notifications
- Verification expiry reminders
- Advanced search and filtering
- Statistics and analytics dashboard
- Multi-language support

# Verification Module Documentation

## Overview

The Verification Module is a comprehensive system integrated into the Great Pearl Coffee Factory management system. It allows the company to issue, manage, and verify employee IDs and documents through QR codes and verification codes.

## Features

### Public Features
- **Verification Search Page** (`/verify`) - Anyone can search for a verification code
- **Live QR Code Scanner** - Built-in camera scanner for instant QR code verification
- **Manual Code Entry** - Alternative option to type verification codes manually
- **Verification Result Page** (`/verify/:code`) - Displays verification status and details
- **Mobile Optimized** - Responsive design works on all devices

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

#### Using the Built-in QR Scanner (Recommended)

1. Visit `/verify` on your domain
2. Click the blue "Scan QR Code" button
3. Allow camera access when prompted
4. Position the QR code within the scanning frame
5. The system automatically detects and verifies the code
6. View the verification results instantly

**Camera Permissions:**
- First-time users will be asked to grant camera access
- The camera is used only for scanning and no images are stored
- Works on mobile devices and desktop computers with cameras

#### Manual Code Entry (Alternative)

1. Visit `/verify` on your domain
2. Scroll to the "OR ENTER MANUALLY" section
3. Type the verification code from the document or ID card
4. Click "Verify Now"
5. View the verification results

#### Scanning with External QR Readers

1. Use any QR code reader app
2. Scan the QR code on the document
3. The QR code automatically opens the verification result page
4. View the verification status and details

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
- **QR Code Generation**: QR Server API
- **QR Code Scanning**: html5-qrcode
- **Date Formatting**: date-fns

## Troubleshooting

### Verification Not Found
- Check that the code is entered correctly (case-sensitive)
- Verify the code exists in the admin panel
- Ensure there are no extra spaces

### QR Scanner Issues

#### Camera Not Working
- Ensure browser has permission to access camera
- Check device camera permissions in system settings
- Try using a different browser (Chrome/Safari recommended)
- Verify camera is not being used by another application
- Use HTTPS connection (camera access requires secure connection)

#### QR Code Not Scanning
- Ensure good lighting conditions
- Hold the QR code steady within the scanning frame
- Try adjusting the distance from the camera
- Clean the camera lens if blurry
- Ensure QR code is not damaged or obscured
- Try manual entry if scanning continues to fail

#### Permission Denied Error
- Clear browser cache and cookies
- Reload the page and grant permissions again
- Check browser settings for camera permissions
- Try opening the page in an incognito/private window

### Downloaded QR Code Not Working
- Confirm QR code points to correct domain
- Test QR code with multiple scanners
- Re-download QR code if corrupted
- Ensure QR code image is high quality when printed

### Access Denied (Admin Panel)
- Ensure user has admin privileges
- Check that user is logged in
- Verify role permissions in auth system

## Future Enhancements

Potential features for future development:
- Photo upload for employee IDs (with cropping)
- Document PDF attachment and access
- PIN-protected document downloads
- Bulk import/export functionality (CSV/Excel)
- Email notifications on verification
- SMS verification notifications
- Verification expiry reminders
- Advanced search and filtering
- Statistics and analytics dashboard
- Multi-language support
- Offline QR code generation
- Batch QR code printing
- Digital signature verification
- Verification history tracking per code
- Custom verification templates

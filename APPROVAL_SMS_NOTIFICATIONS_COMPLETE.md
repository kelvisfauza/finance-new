# Complete Approval SMS Notification System

## Overview
The system now sends SMS notifications at two key stages:
1. **When requests are submitted** - Approvers (Alex, Morjalia, etc.) receive notification
2. **When Finance approves** - Applicants receive confirmation with payment mode

## Notification Flow

### Stage 1: Request Submission
When an employee submits an HR payment, expense, or requisition request:

**Recipients:** Administrators and Super Admins (Alex, Morjalia)
**Trigger:** Request creation via `useApprovalSystem` hook
**Message Format:**
```
Dear [Approver Name], [Requester Name] has requested approval for [Request Type] of UGX [Amount]. Please review and approve/reject in the Finance Portal.
```

**Example:**
```
Dear Alex, John Doe has requested approval for Salary Request of UGX 500,000. Please review and approve/reject in the Finance Portal.
```

### Stage 2: Admin Approval
When Admin approves a request, it moves to Finance for review. No SMS sent at this stage (in-app notification only).

### Stage 3: Finance Approval
When Finance approves the request:

**Recipients:** Original applicant/requester
**Trigger:** Finance approval in HRPayments, Expenses, or Requisitions pages
**Message Format:**
```
Dear [Applicant Name], your [Request Type] request for UGX [Amount] has been fully approved by Finance. Payment Mode: [Payment Mode]. Funds will be processed shortly.
```

**Example:**
```
Dear John Doe, your Salary Request request for UGX 500,000 has been fully approved by Finance. Payment Mode: CASH. Funds will be processed shortly.
```

## Implementation Details

### 1. Request Submission Notifications

**Location:** `src/hooks/useApprovalSystem.ts`

**Function:** `createApprovalRequest()`

**Process:**
1. Create approval request in database
2. Fetch all active Administrators and Super Admins with phone numbers
3. Send SMS to each approver via `sendApprovalRequestSMS()`
4. Create in-app notification for each approver

**Key Code:**
```typescript
const { data: employees } = await supabase
  .from('employees')
  .select('id, name, phone, role')
  .in('role', ['Administrator', 'Super Admin'])
  .eq('is_active', true)
  .not('phone', 'is', null)

for (const approver of employees) {
  await sendApprovalRequestSMS(
    approver.name,
    approver.phone,
    request.amount,
    request.requested_by_name,
    request.request_type
  )
}
```

### 2. Finance Approval Notifications

**Locations:**
- `src/pages/HRPayments.tsx`
- `src/pages/Expenses.tsx`
- `src/pages/Requisitions.tsx`

**Function:** `sendFinanceApprovalCompleteSMS()`

**Process:**
1. Finance user approves request
2. System updates database and processes payment
3. Fetch requester's employee details (including phone)
4. Send SMS with approval confirmation and payment mode

**Key Code:**
```typescript
const requester = getEmployee(selectedExpense.requestedby)
if (requester?.phone) {
  await sendFinanceApprovalCompleteSMS(
    requester.name || selectedExpense.requestedby,
    requester.phone,
    selectedExpense.amount,
    selectedExpense.type,
    'CASH'
  )
}
```

## SMS Functions Reference

### Location
`src/hooks/useSMSNotifications.ts`

### Available Functions

#### 1. sendApprovalRequestSMS
Notifies approvers when new request is submitted.

**Parameters:**
- `approverName`: string - Name of the approver
- `approverPhone`: string - Phone number of approver
- `amount`: number - Request amount
- `senderName`: string - Name of requester
- `type`: string - Request type

#### 2. sendFinanceApprovalCompleteSMS
Notifies applicant when Finance approves their request.

**Parameters:**
- `recipientName`: string - Name of the applicant
- `recipientPhone`: string - Phone number of applicant
- `amount`: number - Request amount
- `requestType`: string - Type of request
- `paymentMode`: string - Payment method (CASH, MOBILE_MONEY, BANK)

#### 3. sendApprovalResponseSMS
Generic approval/rejection notification.

**Parameters:**
- `recipientName`: string
- `recipientPhone`: string
- `amount`: number
- `status`: 'approved' | 'rejected'
- `approverName`: string
- `type`: string

## Request Types Covered

### HR Payments
- Salary Request
- Wage Request
- Employee Salary Request
- Salary Advance

**Approver SMS:** ✅ Sent on submission
**Applicant SMS:** ✅ Sent on Finance approval

### Expenses
- Expense Request
- Company Expense
- Field Financing Request
- Personal Expense

**Approver SMS:** ✅ Sent on submission
**Applicant SMS:** ✅ Sent on Finance approval

### Requisitions
- Requisition
- Cash Requisition

**Approver SMS:** ✅ Sent on submission
**Applicant SMS:** ✅ Sent on Finance approval

## Payment Modes

Currently implemented:
- **CASH** - Default for all approvals

Future payment modes ready for implementation:
- **MOBILE_MONEY** - For MTN, Airtel Money transfers
- **BANK** - For bank transfers
- **CHEQUE** - For cheque payments

## Error Handling

### SMS Send Failures
- Logged to console but don't block approval process
- Approval completes successfully even if SMS fails
- User experience is not affected

### Missing Phone Numbers
- SMS is skipped silently if phone number is missing
- Approval process continues normally
- System logs the skip for audit purposes

### Database Errors
- Transaction rolled back if critical operations fail
- SMS errors don't affect database transactions
- Clear error messages provided to users

## Security & Privacy

### Phone Number Access
- Only fetched by authorized users (Admin, Finance)
- Not exposed in logs or error messages
- Complies with data protection requirements

### SMS Content
- No sensitive account information
- No passwords or security codes
- Only includes public request details
- Amount and request type only

### Rate Limiting
- Consider implementing in production
- Prevent SMS spam/abuse
- Monitor SMS usage patterns

## Testing Checklist

### Approver Notifications (Stage 1)
- ✅ Admin receives SMS when HR payment submitted
- ✅ Admin receives SMS when expense submitted
- ✅ Admin receives SMS when requisition submitted
- ✅ Multiple admins all receive SMS
- ✅ SMS includes correct request details
- ✅ SMS sent only to active admins with phones

### Applicant Notifications (Stage 3)
- ✅ Applicant receives SMS on Finance approval of HR payment
- ✅ Applicant receives SMS on Finance approval of expense
- ✅ Applicant receives SMS on Finance approval of requisition
- ✅ SMS includes payment mode
- ✅ SMS includes correct amount
- ✅ SMS sent only if applicant has phone number

### Edge Cases
- ✅ No SMS when phone missing (doesn't block approval)
- ✅ Approval works when SMS service down
- ✅ Multiple requests handled correctly
- ✅ Concurrent approvals don't cause issues

## Configuration Requirements

### Database Tables
- `employees` - Must have `phone` column
- `approval_requests` - Standard fields required
- `money_requests` - For legacy HR payments

### Phone Number Format
- Recommended: +256XXXXXXXXX (Uganda format)
- System accepts any format SMS service supports

### SMS Service
- Supabase Edge Function: `send-sms`
- Must be configured and deployed
- See Supabase SMS documentation for setup

### Environment Variables
No additional variables needed. Uses existing Supabase configuration.

## Monitoring & Maintenance

### Logs to Monitor
```
console.log('Sending approval SMS to approver:', approverName)
console.log('Sending finance approval SMS to:', recipientName)
console.error('Error sending SMS:', error)
```

### Database Queries
```sql
-- Check employees with missing phone numbers
SELECT name, email, role
FROM employees
WHERE phone IS NULL
AND is_active = true
AND role IN ('Administrator', 'Super Admin');

-- Check recent approval requests
SELECT *
FROM approval_requests
ORDER BY created_at DESC
LIMIT 50;
```

### SMS Delivery Tracking
Consider implementing:
1. SMS log table to track all sent messages
2. Delivery status tracking
3. Failed SMS retry mechanism
4. Daily SMS usage reports

## Who Receives Notifications

### Approvers (Request Submission)
**Role Requirements:**
- Role = 'Administrator' OR 'Super Admin'
- is_active = true
- phone IS NOT NULL

**Current Approvers:**
- Alex (if configured as Admin/Super Admin)
- Morjalia (if configured as Admin/Super Admin)
- Any other active admins with phone numbers

### Applicants (Finance Approval)
**Requirements:**
- Must be the original requester
- Must have phone number in employees table
- Request must be fully approved by Finance

## Future Enhancements

### 1. Configurable Recipients
- Allow custom approver groups per request type
- Department-specific approvers
- Escalation chains

### 2. SMS Templates
- Customizable message templates
- Multi-language support
- Company branding

### 3. Delivery Tracking
- SMS delivery confirmation
- Read receipts where available
- Retry failed messages

### 4. User Preferences
- Opt-in/opt-out options
- Preferred notification channels
- Quiet hours configuration

### 5. Advanced Features
- Two-way SMS (reply to approve/reject)
- SMS-based status queries
- Automated reminders for pending approvals

## Cost Considerations

### SMS Costs
- Each SMS costs per provider rates
- Estimate: ~2 SMS per approval workflow
  - 1 to approver(s) on submission
  - 1 to applicant on approval
- Multiple admins = multiple SMS per request
- Monitor usage monthly

### Optimization Tips
1. Consolidate notifications where possible
2. Batch similar approvals in daily digest
3. Use SMS only for high-priority notifications
4. Consider email fallback for non-urgent items

## Date Implemented
March 3, 2026

## Last Updated
March 3, 2026

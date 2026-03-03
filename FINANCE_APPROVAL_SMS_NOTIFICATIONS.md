# Finance Approval SMS Notifications

## Overview
When Finance approves HR payments, expenses, or requisitions, the system now automatically sends an SMS notification to the applicant informing them of the approval and the payment mode.

## Features Implemented

### 1. New SMS Notification Function
**Location:** `src/hooks/useSMSNotifications.ts`

Added `sendFinanceApprovalCompleteSMS()` function that sends a complete approval notification including:
- Recipient name
- Request amount (formatted in UGX)
- Request type (Salary, Expense, Requisition, etc.)
- Payment mode (CASH, MOBILE_MONEY, BANK)
- Confirmation message

**SMS Format:**
```
Dear [Name], your [Request Type] request for UGX [Amount] has been fully approved by Finance. Payment Mode: [Payment Mode]. Funds will be processed shortly.
```

### 2. Integration Points

#### HR Payments (`src/pages/HRPayments.tsx`)
- Sends SMS when Finance approves salary requests
- Payment mode: CASH
- Includes employee name, amount, and request type

#### Expenses (`src/pages/Expenses.tsx`)
- Sends SMS when Finance approves expense requests
- Payment mode: CASH
- Fetches requester details from employee database
- Includes request type and amount

#### Requisitions (`src/pages/Requisitions.tsx`)
- Sends SMS when Finance approves requisitions
- Payment mode: CASH
- Fetches requester details from employee database
- Includes requisition type and amount

## SMS Message Examples

### HR Payment Approval
```
Dear John Doe, your Salary Request request for UGX 500,000 has been fully approved by Finance. Payment Mode: CASH. Funds will be processed shortly.
```

### Expense Approval
```
Dear Jane Smith, your Expense Request request for UGX 150,000 has been fully approved by Finance. Payment Mode: CASH. Funds will be processed shortly.
```

### Requisition Approval
```
Dear James Wilson, your Cash Requisition request for UGX 300,000 has been fully approved by Finance. Payment Mode: CASH. Funds will be processed shortly.
```

## Technical Details

### Prerequisites
- Employee must have a valid phone number in the database
- SMS function must be configured in Supabase
- The `send-sms` edge function must be deployed

### Error Handling
- SMS sending errors are logged but don't block the approval process
- If employee phone number is missing, SMS is skipped silently
- Main approval process completes regardless of SMS status

### Payment Modes
Currently supported payment modes:
- **CASH** - Default for all approvals
- **MOBILE_MONEY** - For mobile money transfers
- **BANK** - For bank transfers

## Future Enhancements

### Possible Improvements
1. **Dynamic Payment Mode Detection**
   - Detect payment mode from request details
   - Support multiple payment channels per request

2. **Additional Payment Modes**
   - CHEQUE
   - WALLET
   - DIRECT_DEPOSIT

3. **SMS Delivery Tracking**
   - Track SMS delivery status
   - Retry failed SMS messages
   - Store SMS history in database

4. **Customizable Templates**
   - Allow admins to customize SMS templates
   - Support multiple languages
   - Add company branding

5. **SMS Preferences**
   - Allow users to opt-in/opt-out of SMS notifications
   - Set notification preferences per request type

## Testing

### Manual Testing Steps
1. Create a test expense/requisition/HR payment request
2. Have an admin approve the request
3. Have Finance user approve the request
4. Verify SMS is sent to the requester's phone
5. Confirm SMS contains correct details:
   - Recipient name
   - Amount in UGX
   - Request type
   - Payment mode
   - Approval message

### Test Cases
- ✅ Finance approves HR payment with valid phone number
- ✅ Finance approves expense with valid phone number
- ✅ Finance approves requisition with valid phone number
- ✅ Approval works when phone number is missing (SMS skipped)
- ✅ Approval works when SMS service is unavailable

## Security Considerations

1. **Phone Number Privacy**
   - Phone numbers are only accessed by authorized users
   - SMS content doesn't include sensitive details

2. **SMS Content**
   - Generic success message
   - No account numbers or sensitive data
   - Only includes public request information

3. **Rate Limiting**
   - Consider implementing rate limiting on SMS sending
   - Prevent spam/abuse

## Configuration

### Environment Variables
No additional environment variables required. Uses existing Supabase SMS configuration.

### Database Requirements
- `employees` table must have `phone` column
- Phone numbers should be in format: +256XXXXXXXXX

## Date Implemented
March 3, 2026

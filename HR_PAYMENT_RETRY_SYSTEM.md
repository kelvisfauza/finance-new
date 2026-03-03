# HR Payment Retry System

## Overview
The HR Payments page now includes a comprehensive retry mechanism for failed mobile money payouts. When the GosentePay API fails to process a withdrawal, the system displays the failed payment with a retry button.

## Implementation Date
March 3, 2026

## How It Works

### Database Tracking
The `withdrawal_requests` table tracks payout lifecycle using these columns:

| Column | Values | Purpose |
|--------|--------|---------|
| `payout_status` | `pending` → `processing` → `sent` or `failed` | Tracks Mobile Money transfer state |
| `payout_error` | e.g., "transfer Rejected" | Exact error message from GosentePay API |
| `payout_ref` | e.g., "WR-2026-03-03-4063" | Transaction reference on success |
| `payout_attempted_at` | Timestamp | When the last payout attempt was made |

### Payment Lifecycle

1. **Finance Approval**
   - Finance approves withdrawal
   - `status` = 'approved'
   - `payout_status` = 'processing'

2. **Payout Success**
   - API successfully transfers money
   - `payout_status` = 'sent'
   - `payout_ref` = 'TX123'
   - `payout_error` = null
   - Payment disappears from failed list

3. **Payout Failure**
   - API rejects transfer (e.g., invalid number, insufficient funds)
   - `payout_status` = 'failed'
   - `payout_error` = 'transfer Rejected' (or other error)
   - Payment appears in "Failed Payouts" section

4. **Retry**
   - Finance clicks "Retry Payout" button
   - `payout_status` = 'processing'
   - `payout_error` = null
   - `payout_attempted_at` = current timestamp
   - System attempts to process payment again

## UI Components

### Failed Payouts Section
Located at the top of the HR Payments page when there are failed payouts.

**Features:**
- Red background with alert styling
- Shows count of failed payouts
- Displays error message from API
- Shows last attempt timestamp
- "Retry Payout" button for each failed payment

**Query:**
```sql
WHERE status = 'approved'
AND payout_status IN ('failed', 'processing')
ORDER BY payout_attempted_at DESC
```

### Display Information
Each failed payout card shows:
- Employee name and position
- Amount (formatted as currency)
- Payment method (Mobile Money, Bank, or Cash)
- Phone number or account details
- Error message from API
- Last attempt timestamp
- Current payout status badge
- Retry button

## Code Location

### Main Component
`src/components/finance/WithdrawalRequestsManager.tsx`

### Key Functions

#### `fetchRequests()`
Fetches both pending withdrawal requests and failed payouts:
```typescript
const { data: failedData } = await supabase
  .from('withdrawal_requests')
  .select('*')
  .eq('status', 'approved')
  .in('payout_status', ['failed', 'processing'])
  .order('payout_attempted_at', { ascending: false })
```

#### `handleRetryPayout(request)`
Retries a failed payout:
```typescript
await supabase
  .from('withdrawal_requests')
  .update({
    payout_status: 'processing',
    payout_error: null,
    payout_attempted_at: new Date().toISOString()
  })
  .eq('id', request.id)
```

## User Flow

### Finance User Perspective

1. **Failed Payment Appears**
   - After API failure, payment appears in red "Failed Payouts" section
   - Error message is clearly displayed

2. **Review Failure**
   - Finance reviews error message
   - Verifies payment details (phone number, amount)
   - Determines if issue is fixable

3. **Retry Payment**
   - Clicks "Retry Payout" button
   - Confirms retry in dialog showing:
     - Amount
     - Payment method
     - Phone/account details
     - Previous error
   - System resets payout status to 'processing'

4. **Outcome**
   - **Success**: Payment disappears from failed list, moves to sent
   - **Failure**: Payment remains in failed list with new error message

## Common Error Types

### GosentePay API Errors

1. **"transfer Rejected"**
   - Most common error
   - Usually means invalid phone number or API issue
   - Solution: Verify phone number format, retry

2. **"Insufficient balance"**
   - GosentePay account has insufficient funds
   - Solution: Top up API account, then retry

3. **"Invalid phone number"**
   - Phone number format is incorrect
   - Solution: Update phone number in employee profile, retry

4. **Network timeout**
   - API didn't respond in time
   - Solution: Retry immediately

## Benefits

1. **No Data Loss**
   - All failed payments are tracked
   - Nothing falls through the cracks

2. **Clear Error Visibility**
   - Finance sees exactly what went wrong
   - Error message from API is preserved

3. **Easy Recovery**
   - One-click retry functionality
   - No manual re-entry of payment details

4. **Audit Trail**
   - `payout_attempted_at` tracks all attempts
   - `payout_error` history is preserved

## Real-Time Updates

The component subscribes to database changes:
```typescript
const channel = supabase
  .channel('withdrawal-requests-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'withdrawal_requests'
  }, fetchRequests)
  .subscribe()
```

When payout status changes (from external process or webhook):
- Failed payouts section updates automatically
- No page refresh needed
- Real-time visibility

## Testing Recommendations

### Test Cases

1. **Failed Payout Display**
   - Create withdrawal with payout_status = 'failed'
   - Verify it appears in Failed Payouts section
   - Verify error message displays correctly

2. **Retry Success**
   - Click "Retry Payout" on failed payment
   - Verify payout_status changes to 'processing'
   - Verify payout_error is cleared
   - Mock successful API response
   - Verify payment disappears from failed list

3. **Retry Failure**
   - Click "Retry Payout"
   - Mock API failure
   - Verify payment remains in failed list
   - Verify new error message is displayed

4. **Real-Time Updates**
   - Have two browser windows open
   - Retry payment in one window
   - Verify other window updates automatically

## Security Notes

1. **Permission Check**
   - Only Finance users can see this component
   - Protected by PermissionGate with Finance permissions

2. **No Manual Status Override**
   - Finance cannot manually mark as 'sent'
   - All status changes go through API

3. **Audit Trail**
   - All retry attempts are timestamped
   - Error messages are preserved for investigation

## Future Enhancements

### Potential Improvements

1. **Automatic Retry**
   - System automatically retries failed payments after X minutes
   - Exponential backoff strategy

2. **Retry Limit**
   - Max 3 retry attempts
   - After limit, require manual intervention

3. **Phone Number Validation**
   - Validate phone format before sending to API
   - Prevent common format errors

4. **Batch Retry**
   - "Retry All Failed" button
   - Process multiple failures at once

5. **SMS Notifications**
   - Notify finance when payment fails
   - Include error details in SMS

6. **Analytics Dashboard**
   - Track failure rate by error type
   - Identify patterns in API failures

## Related Documentation

- `WITHDRAWAL_APPROVAL_WORKFLOW.md` - Overall withdrawal system
- `WITHDRAWAL_SYSTEM_AUDIT.md` - Withdrawal system audit results
- `FINANCE_SYSTEM_README.md` - General finance system overview

# HR Payment Retry System

## Overview
The HR Payments page now includes a comprehensive retry mechanism for failed mobile money payouts. When the GosentePay API fails to process a withdrawal, the system displays the failed payment with two options:
1. **Retry Payout** - Attempts to process the payment through the API again
2. **Pay Cash Instead** - Converts the payment to cash if API continues to fail

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

4. **Retry Options**

   **Option A: Retry Payout**
   - Finance clicks "Retry Payout" button
   - `payout_status` = 'processing'
   - `payout_error` = null
   - `payout_attempted_at` = current timestamp
   - System attempts to process payment again
   - If fails again, returns to step 3

   **Option B: Pay Cash Instead**
   - Finance clicks "Pay Cash Instead" button
   - `disbursement_method` changes to 'CASH'
   - `payout_status` = 'paid'
   - `payout_error` = null (cleared)
   - `paid_at` = current timestamp
   - Cash transaction record created
   - Cash balance deducted
   - Finance physically pays employee in cash

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

The system uses **dual real-time monitoring** to ensure failed payouts are always current:

### 1. Real-Time Database Subscriptions
```typescript
const channel = supabase
  .channel('withdrawal-requests-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'withdrawal_requests'
  }, (payload) => {
    console.log('Withdrawal request change detected:', payload)
    fetchRequests()
  })
  .subscribe()
```

### 2. Polling Backup (Every 10 seconds)
```typescript
const pollingInterval = setInterval(() => {
  fetchRequests()
}, 10000)
```

### How It Works

When payout status changes (from external API webhook or manual update):
1. **Real-time subscription** detects the database change instantly
2. **Automatic refetch** pulls the latest data including payout_status and payout_error
3. **UI updates immediately** without page refresh
4. **Polling backup** ensures no updates are missed even if WebSocket connection drops

### Real-Time Behavior

**Scenario: Retry fails again**
1. Finance clicks "Retry Payout"
2. Status changes to `processing` in database
3. External API processes payment
4. API returns error → database updates: `payout_status = 'failed'`, `payout_error = 'transfer Rejected'`
5. Real-time subscription detects change
6. Failed payment reappears in UI within 1 second
7. Finance can retry again immediately

**Visual Indicator:**
- Green pulsing dot with "Live" label shows real-time connection is active
- Data refreshes automatically every 10 seconds as backup

### Benefits of Real-Time

1. **Immediate Failure Visibility**
   - If retry fails, finance sees it within seconds
   - No need to manually refresh page

2. **Multiple Users Supported**
   - Two finance staff can see same failed payouts
   - Changes propagate to all open sessions

3. **External Integration Support**
   - Webhook from GosentePay updates database
   - All finance dashboards update automatically

4. **Reliable with Fallback**
   - WebSocket subscription for instant updates
   - Polling backup if WebSocket fails
   - Data is always current

## Cash Fallback Option

When API retries continue to fail, finance staff can convert the payment to cash.

### "Pay Cash Instead" Button

Located next to "Retry Payout" on failed payments.

**What It Does:**
1. Changes `disbursement_method` from MOBILE_MONEY/BANK → CASH
2. Marks `payout_status` as 'paid'
3. Sets `paid_at` timestamp
4. Creates cash transaction record in `finance_cash_transactions`
5. Generates payout reference: `CASH-FALLBACK-{timestamp}`
6. Deducts from cash balance (via existing trigger)

**Confirmation Dialog:**
```
Convert to Cash Payment?

Employee: John Masereka
Amount: UGX 40,000
Original Method: MOBILE_MONEY
Phone: 0754121793
Original Error: transfer Rejected

This will:
- Mark the withdrawal as approved and paid
- Change payment method to CASH
- Deduct UGX 40,000 from cash balance
- Create a transaction record showing cash payment

You will need to physically pay UGX 40,000 in cash to John Masereka.

Continue?
```

### Database Changes

**withdrawal_requests table:**
```sql
UPDATE withdrawal_requests SET
  disbursement_method = 'CASH',
  payout_status = 'paid',
  payout_error = NULL,
  paid_at = now(),
  payout_attempted_at = now(),
  payout_reference = 'CASH-FALLBACK-1234567890'
WHERE id = '{request_id}'
```

**finance_cash_transactions table:**
```sql
INSERT INTO finance_cash_transactions (
  type,
  amount,
  description,
  reference_type,
  reference_id,
  created_by,
  transaction_date
) VALUES (
  'withdrawal',
  40000,
  'Cash payment (API fallback) - Wallet Withdrawal',
  'withdrawal_request',
  '{request_id}',
  'finance@gpcf.com',
  now()
)
```

### When to Use Cash Fallback

**Good Scenarios:**
- API has been down for extended period
- Specific phone number is blacklisted by provider
- Bank account has issues
- Employee needs urgent payment
- After 3+ failed retry attempts

**Bad Scenarios:**
- First failure (always retry at least once)
- Large amounts without proper authorization
- When cash balance is insufficient

### Audit Trail

The cash fallback creates a complete audit trail:

1. **Original Request**
   - Original `disbursement_method` preserved in history
   - `payout_error` shows why API failed
   - All timestamps preserved

2. **Conversion Record**
   - `payout_reference` shows "CASH-FALLBACK"
   - `paid_at` timestamp when converted
   - `created_by` shows who approved cash payment

3. **Cash Transaction**
   - Full transaction in `finance_cash_transactions`
   - Links to withdrawal request via `reference_id`
   - Description shows "API fallback"

4. **Balance Impact**
   - Cash balance automatically reduced
   - Ledger entry created by trigger
   - User's wallet already deducted (happened at approval)

### Security

**Permissions Required:**
- Finance role
- Cannot convert own withdrawal request
- Must have sufficient cash balance

**Validations:**
- Confirmation dialog requires explicit approval
- Transaction is atomic (withdrawal + cash transaction)
- If either fails, entire operation rolls back
- Real-time update triggers immediately

### User Experience Flow

1. **Finance sees failed payout**
   - Red alert box at top
   - Shows error message
   - Two buttons: "Retry Payout" | "Pay Cash Instead"

2. **Finance chooses cash fallback**
   - Clicks "Pay Cash Instead"
   - Reviews confirmation dialog
   - Confirms payment method change

3. **System processes conversion**
   - Updates withdrawal status
   - Creates cash transaction
   - Updates cash balance
   - Real-time sync removes from failed list

4. **Finance completes payment**
   - Physically pays employee in cash
   - Transaction already recorded
   - Audit trail complete

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

4. **Cash Fallback**
   - Click "Pay Cash Instead" on failed payment
   - Verify confirmation dialog shows correct details
   - Confirm action
   - Verify disbursement_method changes to CASH
   - Verify payout_status changes to 'paid'
   - Verify cash transaction is created
   - Verify payment disappears from failed list
   - Check that cash balance is reduced

5. **Real-Time Updates**
   - Have two browser windows open
   - Retry payment in one window
   - Verify other window updates automatically
   - Test cash fallback in one window
   - Verify other window updates immediately

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

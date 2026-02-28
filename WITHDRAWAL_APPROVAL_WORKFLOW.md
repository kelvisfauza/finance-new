# Withdrawal Approval Workflow Documentation

**System:** Great Pearl Coffee Finance
**Module:** Withdrawal Requests
**Last Updated:** 2026-02-28

---

## Overview

The withdrawal approval workflow enables employees to request withdrawals from their wallet balance through a secure, tiered approval process. The system enforces different approval requirements based on withdrawal amount and includes automatic balance verification, SMS notifications, and multiple disbursement options.

---

## Workflow Stages

### 1. User Submits Withdrawal Request

**Component:** `WithdrawalRequestForm.tsx`

**User Actions:**
- Views available wallet balance
- Enters withdrawal amount
- Provides reason for withdrawal
- Selects disbursement method:
  - **Cash** - Collect from finance office with printed voucher
  - **Mobile Money** - Automatic payment to provided phone number
  - **Bank Transfer** - Manual transfer to provided bank account

**System Validations:**
- Amount must be ≤ available wallet balance
- All required fields must be completed
- Disbursement details validated based on selected method

**Database Record Created:**
- Table: `money_requests`
- Type: `request_type = 'withdrawal'`
- Status: `status = 'pending'`
- Auto-calculated: `requires_three_approvals` (true if amount > 100,000 UGX)

---

### 2. Admin Approval Stage

**Component:** `AdminWithdrawalApprovals.tsx`

**Approval Tiers:**
- **≤ 100,000 UGX:** Requires 1 admin approval
- **> 100,000 UGX:** Requires 3 approvals from 3 different admins

**Admin Responsibilities:**
- Review withdrawal request details
- Verify disbursement method is appropriate
- Check user request history
- Approve or reject with reason

**System Enforcements:**
- Admin cannot approve their own withdrawal request
- Same admin cannot approve twice (for high-value requests)
- All approvals tracked with email + timestamp
- Request hidden from Finance until all admin approvals complete

**Database Updates:**
- `admin_approved_1`, `admin_approved_1_by`, `admin_approved_1_at`
- `admin_approved_2`, `admin_approved_2_by`, `admin_approved_2_at` (if required)
- `admin_approved_3`, `admin_approved_3_by`, `admin_approved_3_at` (if required)
- `admin_approved = true` when all required approvals complete

**Rejection:**
- Status changes to `rejected`
- `rejection_reason` stored
- SMS notification sent to user
- No further processing

---

### 3. Finance Approval Stage

**Component:** `WithdrawalRequestsManager.tsx`

**When Requests Appear:**
- Only after ALL required admin approvals are complete
- Filter: `status = 'pending' AND admin_approved = true`

**Finance Responsibilities:**

Before approving, Finance MUST verify:
1. All admin approvals are in place (enforced by system)
2. User's wallet balance supports the withdrawal amount
3. Disbursement method is clearly indicated
4. If Mobile Money - confirm phone number is correct
5. If Bank - confirm account name, number, and bank name
6. Large amounts (> 100,000 UGX) have 3 distinct admin approvals

**System Validations:**
- Self-approval prevention (Finance cannot approve own withdrawal)
- Wallet balance verification (must be ≥ withdrawal amount)
- Admin approval completeness check
- Balance recorded at time of approval for audit

**On Approval:**
1. Status changes to `approved`
2. Finance fields updated:
   - `finance_approved = true`
   - `finance_approved_by = [email]`
   - `finance_approved_at = [timestamp]`
3. Wallet verification fields:
   - `wallet_balance_verified = true`
   - `wallet_balance_at_approval = [balance]`
4. Database trigger automatically:
   - Deducts amount from `user_accounts.current_balance`
   - Increments `user_accounts.total_withdrawn`
5. Disbursement action:
   - **Cash:** Printable voucher generated with signature blocks
   - **Mobile Money:** Payment triggered (requires gateway integration)
   - **Bank:** Finance processes transfer manually
6. SMS notification sent to user

**On Rejection:**
- Finance prompted for clear rejection reason
- Status changes to `rejected`
- `rejection_reason` stored
- No balance deduction occurs
- SMS notification sent with rejection reason

---

## Database Schema

### Core Table: `money_requests`

**Key Fields:**
```
id                              uuid (primary key)
user_id                         uuid (references user_accounts)
amount                          numeric
reason                          text
request_type                    'withdrawal'
status                          'pending', 'approved', 'rejected'
requested_by                    text (email)

# Admin Approval Tracking
requires_three_approvals        boolean (auto-set based on amount)
admin_approved_1                boolean
admin_approved_1_by             text (email)
admin_approved_1_at             timestamptz
admin_approved_2                boolean
admin_approved_2_by             text (email)
admin_approved_2_at             timestamptz
admin_approved_3                boolean
admin_approved_3_by             text (email)
admin_approved_3_at             timestamptz
admin_approved                  boolean (true when all required approvals complete)
admin_approved_by               text (last admin approver)
admin_approved_at               timestamptz (when all admin approvals complete)

# Finance Approval
finance_approved                boolean
finance_approved_by             text (email)
finance_approved_at             timestamptz

# Wallet Verification
wallet_balance_verified         boolean
wallet_balance_at_approval      numeric

# Disbursement Details
payment_channel                 'CASH', 'MOBILE_MONEY', 'BANK'
phone_number                    text (for mobile money)
disbursement_bank_name          text (for bank transfer)
disbursement_account_number     text (for bank transfer)
disbursement_account_name       text (for bank transfer)

# Status Tracking
rejection_reason                text
created_at                      timestamptz
updated_at                      timestamptz
```

---

## Database Triggers

### 1. Auto-set Approval Requirements
**Trigger:** `set_withdrawal_approval_requirements_trigger`
**Function:** `set_withdrawal_approval_requirements()`
**Action:** Sets `requires_three_approvals = true` if amount > 100,000 UGX

### 2. Wallet Balance Deduction
**Trigger:** `on_money_request_approved`
**Function:** `process_money_request_approval()`
**Action:**
- When status changes to 'approved'
- Deducts amount from user's wallet balance
- Validates sufficient balance exists
- Updates `total_withdrawn` counter
- Records balance at approval time

### 3. SMS Notifications
**Trigger:** `notify_withdrawal_status_trigger`
**Function:** `notify_withdrawal_status_change()`
**Action:**
- Queues SMS on approval or rejection
- Includes disbursement method and reason (if rejected)
- Stores in `sms_notification_queue` for processing

---

## Security & Compliance

### Separation of Duties
- Users cannot approve their own requests
- Admins cannot approve same request twice
- Finance cannot approve without admin approval
- All approvers tracked with email + timestamp

### Audit Trail
Complete record of:
- Who requested (email, user_id, timestamp)
- All admin approvers (up to 3 with timestamps)
- Finance approver (email, timestamp)
- Wallet balance at approval time
- Disbursement details
- Rejection reasons

### Balance Protection
- Real-time wallet balance verification
- Cannot approve if insufficient funds
- Automatic deduction via trigger (prevents manual errors)
- Balance recorded for audit

---

## Notification System

### SMS Notifications

**On Approval:**
```
Your withdrawal request of [AMOUNT] UGX has been APPROVED.
Payment will be processed via [METHOD]. - Great Pearl Coffee
```

**On Rejection:**
```
Your withdrawal request of [AMOUNT] UGX has been REJECTED.
Reason: [REJECTION_REASON] - Great Pearl Coffee
```

**Queue Table:** `sms_notification_queue`
- Stores all pending SMS
- Status: pending, sent, failed
- Includes retry mechanism
- Links to original request via `reference_id`

---

## Disbursement Methods

### Cash
**Process:**
1. Finance approves request
2. System generates printable voucher
3. Voucher includes:
   - Employee name
   - Amount
   - Date
   - Signature blocks (Received By, Paid By)
4. Employee collects cash from finance office with voucher
5. Both parties sign voucher

### Mobile Money
**Process:**
1. User provides phone number in request
2. Finance verifies phone number
3. Finance approves request
4. System triggers payment via ZengaPay/GosentePay API
5. User receives SMS confirmation
6. Payment automatically processed

### Bank Transfer
**Process:**
1. User provides bank details:
   - Bank name
   - Account number
   - Account holder name
2. Finance verifies details match user
3. Finance approves request in system
4. Finance processes bank transfer manually
5. User receives SMS confirmation
6. Transfer typically completes within 1-2 business days

---

## Error Handling

### Insufficient Balance
- System prevents approval
- Finance sees clear error message
- User must wait for more funds or reduce amount

### Missing Admin Approvals
- Finance cannot see request until admin approvals complete
- System enforces this at query level

### Invalid Disbursement Details
- Validation at form submission
- Finance double-checks before approval

### Failed SMS
- SMS queued with retry logic
- Finance can view SMS status
- Manual notification if SMS fails repeatedly

---

## Components Reference

### User Components
- `WithdrawalRequestForm.tsx` - Submit withdrawal requests

### Admin Components
- `AdminWithdrawalApprovals.tsx` - Admin approval interface

### Finance Components
- `WithdrawalRequestsManager.tsx` - Finance approval interface

---

## API Integration Points

### Mobile Money Gateway
- **Provider:** ZengaPay / GosentePay
- **Trigger:** Finance approval of mobile money request
- **Endpoint:** To be configured in edge function
- **Required:** API credentials in environment variables

### SMS Gateway
- **Queue Table:** `sms_notification_queue`
- **Processing:** Edge function or external service
- **Frequency:** Real-time or batch processing
- **Required:** SMS API credentials

---

## Testing Checklist

### User Flow
- [ ] Submit withdrawal ≤ 100,000 UGX (1 admin required)
- [ ] Submit withdrawal > 100,000 UGX (3 admins required)
- [ ] Submit with insufficient balance (should fail)
- [ ] Submit with all disbursement methods

### Admin Flow
- [ ] Approve own request (should fail)
- [ ] Approve request twice as same admin (should fail)
- [ ] Approve low-value request (single approval)
- [ ] 3 different admins approve high-value request
- [ ] Reject with reason

### Finance Flow
- [ ] Cannot see requests without admin approval
- [ ] Cannot approve own request (should fail)
- [ ] Cannot approve with insufficient balance (should fail)
- [ ] Approve cash withdrawal (voucher prints)
- [ ] Approve mobile money (payment triggered)
- [ ] Approve bank transfer (details visible)
- [ ] Reject with reason

### System Behavior
- [ ] Balance deducted on approval
- [ ] SMS queued on approval/rejection
- [ ] Audit trail complete
- [ ] Real-time updates via Supabase subscriptions

---

## Troubleshooting

### Request Not Appearing for Finance
- **Check:** Are all admin approvals complete?
- **Check:** Is status = 'pending'?
- **Check:** Is request_type = 'withdrawal'?

### Cannot Approve Request
- **Check:** Is requester trying to approve own request?
- **Check:** Has admin already approved this request?
- **Check:** Is wallet balance sufficient?

### Balance Not Deducted
- **Check:** Is trigger enabled?
- **Check:** Check `wallet_balance_verified` field
- **Check:** Review trigger execution logs

### SMS Not Sent
- **Check:** `sms_notification_queue` table for queued SMS
- **Check:** SMS gateway credentials configured
- **Check:** SMS processing edge function running

---

## Future Enhancements

1. **Automated Mobile Money Integration**
   - ZengaPay/GosentePay API integration
   - Real-time payment status updates
   - Payment confirmation webhooks

2. **Email Notifications**
   - Supplement SMS with email
   - Include PDF voucher attachment

3. **Withdrawal Limits**
   - Daily/weekly withdrawal caps per user
   - Configurable in settings

4. **Approval Delegation**
   - Allow admins to delegate approval authority
   - Temporary approval permissions

5. **Analytics Dashboard**
   - Withdrawal trends
   - Average approval times
   - Rejection reasons analysis

---

## Support Contacts

**Technical Issues:** Contact IT Support
**Approval Process Questions:** Contact Finance Manager
**Payment Delays:** Contact Finance Office

---

*This document is maintained by the IT department and updated as the system evolves.*

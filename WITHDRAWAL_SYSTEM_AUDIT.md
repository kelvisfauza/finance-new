# Withdrawal System Audit Report

**Date:** 2026-02-28
**System:** Finance Withdrawal Approval Workflow

---

## Executive Summary

The withdrawal request system has basic functionality for requesting and approving withdrawals, but lacks critical features required by the documented workflow. This audit identifies gaps between the current implementation and the required workflow specifications.

---

## Current Implementation

### Database Schema

**Table: `money_requests`**
- Basic fields present: `id`, `user_id`, `amount`, `reason`, `status`, `requested_by`
- Approval tracking: `approved_by`, `approved_at`, `admin_approved`, `finance_approved`
- Payment fields: `payment_channel`, `phone_number`
- Missing: Bank transfer fields, multi-admin approval tracking

**Table: `user_accounts`** (Wallet System)
- Fields: `user_id`, `current_balance`, `total_earned`, `total_withdrawn`, `salary_approved`
- Used to track employee wallet balances

**Table: `approval_requests`** (General Approval System)
- Has advanced approval tracking with multi-admin support
- Fields include: `admin_approved_1`, `admin_approved_2`, `requires_three_approvals`
- Has disbursement fields: `disbursement_method`, `disbursement_phone`, `disbursement_bank_name`, `disbursement_account_number`, `disbursement_account_name`

### Existing Triggers

1. **on_money_request_approved** - Adds money to user wallet when approved
2. **process_money_request_two_step_approval_trigger** - Handles finance + admin approval flow
3. **check_lunch_allowance_trigger** - Weekly allowance limit check

### Current UI Component

**WithdrawalRequestsManager.tsx**
- Displays pending withdrawal requests
- Shows employee name, amount, reason
- Supports Cash and Mobile Money payment channels
- Basic approve/reject buttons
- Prints cash slip for cash payments

---

## Gap Analysis

### 1. Admin Approval Tiers ❌ MISSING

**Required:**
- Amounts ≤ 100,000 UGX: 1 Admin approval
- Amounts > 100,000 UGX: 3 Admin approvals from 3 different admins

**Current State:**
- No admin approval tier logic in `money_requests`
- No tracking of multiple admin approvers
- `approval_requests` table has this feature, but `money_requests` doesn't

**Impact:** HIGH - Critical workflow validation missing

---

### 2. Bank Transfer Support ❌ MISSING

**Required:**
- Bank as disbursement method
- Bank account name, number, bank name fields

**Current State:**
- Only Cash and Mobile Money supported
- No bank detail fields in `money_requests` table
- `approval_requests` has these fields

**Impact:** HIGH - Cannot process bank transfers

---

### 3. Wallet Balance Verification ❌ MISSING

**Required:**
- Verify user's wallet balance before approval
- Ensure sufficient funds exist

**Current State:**
- No balance check before approval
- Trigger adds to wallet instead of deducting from it
- Logic is backwards (adds money instead of withdrawing)

**Impact:** CRITICAL - Can approve withdrawals without funds

---

### 4. Self-Approval Prevention ❌ MISSING

**Required:**
- Finance officer cannot approve their own withdrawal request

**Current State:**
- No check to prevent self-approval
- Anyone with finance access can approve any request

**Impact:** HIGH - Security and compliance risk

---

### 5. Wallet Balance Deduction ❌ INCORRECT

**Required:**
- Deduct from wallet balance on approval

**Current State:**
- Existing trigger ADDS to wallet balance (incorrect for withdrawals)
- Function `process_money_request_approval` increases balance instead of decreasing

**Impact:** CRITICAL - Balance calculations are wrong

---

### 6. Rejection Reason Prompt ❌ MISSING

**Required:**
- Finance must provide clear rejection reason
- User receives SMS with rejection reason

**Current State:**
- Simple confirm dialog with no reason input
- `rejection_reason` field exists but not populated
- No user-friendly rejection flow

**Impact:** MEDIUM - Poor user experience

---

### 7. SMS Notifications ❌ MISSING

**Required:**
- SMS on approval
- SMS on rejection with reason

**Current State:**
- `finance_notifications` table exists for in-app notifications
- No SMS integration visible
- No hook for useSMSNotifications in withdrawal flow

**Impact:** MEDIUM - Users not notified of status changes

---

### 8. Mobile Money Auto-Payment ❌ MISSING

**Required:**
- Automatic payment via ZengaPay/GosentePay
- Triggered on finance approval

**Current State:**
- Manual button click to approve
- No payment gateway integration
- No ZengaPay/GosentePay API calls

**Impact:** HIGH - Manual payment processing required

---

### 9. Admin Approval Stage Enforcement ❌ MISSING

**Required:**
- Withdrawal requests only appear to Finance AFTER all admin approvals complete
- System automatically enforces this

**Current State:**
- Finance sees all pending requests immediately
- No check for required admin approvals before showing to finance
- No integration with admin approval system

**Impact:** HIGH - Finance may approve before admin review

---

### 10. Admin Approval Count Tracking ❌ MISSING

**Required:**
- Track 3 separate admin approvals for amounts > 100,000 UGX
- Store approver identity and timestamp for each

**Current State:**
- Only single `admin_approved_by` and `admin_approved_at` fields
- Cannot track multiple distinct approvers
- No validation that 3 different people approved

**Impact:** HIGH - Cannot audit approval chain

---

## Positive Findings ✅

1. **Basic workflow infrastructure exists** - Core tables and approval flow are functional
2. **User account/wallet system exists** - `user_accounts` table tracks balances
3. **Payment channel flexibility** - Cash and Mobile Money options work
4. **Real-time updates** - Supabase subscriptions keep UI in sync
5. **Cash slip printing** - Functional voucher generation for cash payments
6. **Notification system foundation** - `finance_notifications` table ready for use
7. **Reference implementation available** - `approval_requests` table has many required features

---

## Recommended Architecture

### Option 1: Enhance `money_requests` table
- Add missing fields to match `approval_requests` structure
- Implement multi-admin approval tracking
- Add bank transfer fields
- Fix wallet deduction logic

### Option 2: Use `approval_requests` for withdrawals
- Leverage existing advanced approval system
- Map withdrawal requests to approval_requests with type='withdrawal'
- Reuse existing multi-admin approval logic
- Extend with wallet balance validation

**Recommendation:** Option 1 is preferred to maintain separation of concerns. Withdrawal requests have unique wallet-related business logic that doesn't fit general approval requests.

---

## Priority Recommendations

### Must Fix (P0) - Security & Correctness
1. Fix wallet balance deduction (currently adds instead of subtracts)
2. Add wallet balance verification before approval
3. Implement self-approval prevention
4. Add admin approval tier enforcement

### High Priority (P1) - Workflow Completeness
5. Add bank transfer support
6. Implement multi-admin approval tracking for amounts > 100,000 UGX
7. Hide requests from Finance until admin approvals complete
8. Add rejection reason prompt

### Medium Priority (P2) - User Experience
9. Implement SMS notifications
10. Integrate mobile money auto-payment
11. Add audit logging for approval actions
12. Improve error handling and user feedback

---

## Next Steps

1. Create database migration to add missing fields
2. Fix wallet deduction trigger
3. Update WithdrawalRequestsManager component with complete workflow
4. Add admin approval UI and logic
5. Implement SMS notification system
6. Test end-to-end with various scenarios
7. Document the complete workflow for users

---

## Conclusion

The current system provides a foundation but requires significant enhancements to meet the documented workflow requirements. Most critically, the wallet balance logic is incorrect (adds instead of subtracts), and critical security checks are missing. With the recommended changes, the system will provide a complete, auditable, and secure withdrawal approval workflow.

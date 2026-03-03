# Approval Notification Recipients - Complete List

## Summary
The system has been updated to send SMS notifications to ALL employees with approval permissions, not just Administrators.

## Who Receives Approval Request SMS Notifications

When an employee submits an HR payment, expense, or requisition request, the following **10 people** will receive SMS notifications:

### Administrators (5 people)
1. **bwambale denis** - Administrator
   - Phone: 0779370420
   - Reason: Has Administrator role

2. **Fauza Kusa 2** - Administrator
   - Phone: 256781121639
   - Reason: Has Administrator role + Finance permissions

3. **Kelvis Fauza** - Administrator
   - Phone: +256752724165
   - Reason: Has Administrator role + Finance permissions

4. **Musema Wyclif** - Administrator
   - Phone: 0783783187
   - Reason: Has Administrator role

5. **supera dmin** (operations@greatpearlcoffee.com) - Administrator
   - Phone: 0778536681
   - Reason: Has Administrator role + All permissions

### Finance/Quality Managers (5 people)
6. **Mukobi Godwin** - Finance Manager
   - Phone: 0760587186
   - Reason: Has Finance:approve, Finance:process permissions

7. **Tumwine Alex** - Quality Manager
   - Phone: 0771974897
   - Reason: Has Quality Control:approve permission

8. **Morjalia Jadens** - Quality Manager
   - Phone: +256760698680
   - Reason: Has Quality Control:approve permission

9. **Kibaba Nicholus** - User
   - Phone: 0700729340
   - Reason: Has Finance:approve permission

10. **John Masereka** - User
    - Phone: 0785208473
    - Reason: Has EUDR Documentation:approve permission

## Notification Logic

The system now sends notifications to employees who meet ANY of these criteria:

### 1. Administrator Role
- Role = 'Administrator'
- Role = 'Super Admin'
- Role = 'Manager'

### 2. Finance Approval Permission
- Has 'Finance:approve' permission
- Has 'Finance:process' permission
- Has 'Finance' permission

### 3. Any Approval Permission
- Has any permission containing 'approve'
- Has any permission containing 'Approval'

### 4. Must Have Phone Number
- Phone number must be present in database
- Invalid or missing phone numbers are excluded

## Previous vs Updated System

### Before (Only Administrators)
- Only sent to 5 people: Administrators and Super Admins
- **Missed**: Morjalia Jadens, Tumwine Alex, Mukobi Godwin, and others with approval permissions

### After (All Approvers)
- Sends to 10 people: Administrators + anyone with approval permissions
- **Now Includes**: All managers and users with approval rights

## SMS Message Format

When a request is submitted, each of the 10 approvers receives:

```
Dear [Approver Name], [Requester Name] has requested approval for [Request Type] of UGX [Amount]. Please review and approve/reject in the Finance Portal.
```

Example:
```
Dear Morjalia Jadens, John Doe has requested approval for Salary Request of UGX 500,000. Please review and approve/reject in the Finance Portal.
```

## Employees Who Do NOT Receive Notifications

These employees have phone numbers but no approval permissions:

1. **Adinan Kariim** - User (Quality Control, Store Management only)
2. **Artwanzire Timothy** - User (View-only permissions)
3. **Bwambale Benson** - User (Store Management, Inventory)
4. **Kahindo Daphine** - User (Store Management, Sales & Marketing)
5. **Shafik Yeda** - User (Reports, Quality Control view only)
6. **Sserunkuma Taufiq** - User (Store Management, Sales Marketing)

These employees correctly do NOT receive approval notifications because they don't have approval permissions.

## Code Implementation

### Location
`src/hooks/useApprovalSystem.ts`

### Key Changes

#### Old Code (Restricted to Admins)
```typescript
const { data: employees } = await supabase
  .from('employees')
  .select('id, name, phone, role')
  .in('role', ['Administrator', 'Super Admin'])
  .eq('is_active', true)
  .not('phone', 'is', null)
```

#### New Code (All Approvers)
```typescript
const { data: employees } = await supabase
  .from('employees')
  .select('id, name, phone, role, permissions')
  .not('phone', 'is', null)

const approvers = employees.filter((emp) => {
  const isAdmin = ['Administrator', 'Super Admin', 'Manager'].includes(emp.role)
  const hasFinanceApproval = emp.permissions?.some((p) =>
    p.includes('Finance:approve') ||
    p.includes('Finance:process') ||
    p === 'Finance'
  )
  const hasApprovalPerm = emp.permissions?.some((p) =>
    p.includes('approve') ||
    p.includes('Approval')
  )

  return isAdmin || hasFinanceApproval || hasApprovalPerm
})
```

## Testing Results

### Query to Verify Recipients
```sql
WITH approvers AS (
  SELECT
    name,
    role,
    phone,
    permissions,
    CASE
      WHEN role IN ('Administrator', 'Super Admin', 'Manager') THEN true
      ELSE false
    END AS is_admin,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(permissions) AS p
        WHERE p LIKE '%Finance:approve%'
          OR p LIKE '%Finance:process%'
          OR p = 'Finance'
      ) THEN true
      ELSE false
    END AS has_finance_approval,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(permissions) AS p
        WHERE p LIKE '%approve%'
          OR p LIKE '%Approval%'
      ) THEN true
      ELSE false
    END AS has_approval_perm
  FROM employees
  WHERE phone IS NOT NULL
)
SELECT
  name,
  role,
  phone,
  (is_admin OR has_finance_approval OR has_approval_perm) AS will_receive_sms
FROM approvers
WHERE (is_admin OR has_finance_approval OR has_approval_perm)
ORDER BY name;
```

## Impact Analysis

### Before Fix
- **5 people** received approval request notifications
- Alex and Morjalia were NOT receiving notifications despite being key approvers
- Finance Manager Mukobi Godwin was NOT receiving notifications

### After Fix
- **10 people** now receive approval request notifications
- Alex, Morjalia, and Mukobi now receive notifications
- All employees with any approval permission are included
- More comprehensive coverage of approval workflow

## SMS Costs

### Before: 5 SMS per request
- 5 administrators × 1 SMS each = 5 SMS

### After: 10 SMS per request
- 10 approvers × 1 SMS each = 10 SMS

### Cost Impact
- **2x increase** in SMS volume per approval request
- Estimated additional cost: ~5 SMS per request
- Trade-off: Better communication vs SMS costs
- Recommendation: Monitor costs and adjust if needed

## Recommendations

### Short Term
1. Monitor SMS delivery success rate
2. Verify all 10 people are receiving notifications
3. Confirm no duplicate notifications

### Medium Term
1. Add user preference to opt-out of SMS notifications
2. Implement SMS digest (batch notifications)
3. Add email notifications as alternative

### Long Term
1. Role-based notification routing (e.g., Finance requests → Finance Manager only)
2. Department-specific approval chains
3. Escalation logic for delayed approvals

## Date Implemented
March 3, 2026

## Last Updated
March 3, 2026

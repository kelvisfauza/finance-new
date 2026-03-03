# Approval Notification Recipients - Hardcoded List

## Summary
The system has been configured to send SMS notifications ONLY to 3 specific people, regardless of role or permissions.

## Who Receives Approval Request SMS Notifications

When any employee submits an HR payment, expense, or requisition request, only these **3 people** will receive SMS notifications:

### Hardcoded Approvers

1. **Fauza Kusa 2** (fauzakusa@greatpearlcoffee.com)
   - Phone: 256781121639
   - Role: Administrator

2. **bwambale denis** (bwambaledenis@greatpearlcoffee.com)
   - Phone: 0779370420
   - Role: Administrator

3. **Mukobi Godwin** (godwinmukobi@greatpearlcoffee.com)
   - Phone: 0760587186
   - Role: Finance Manager

## Implementation Details

### Location
`src/hooks/useApprovalSystem.ts` (lines 41-51)

### Hardcoded Email List
```typescript
const approverEmails = [
  'fauzakusa@greatpearlcoffee.com',
  'bwambaledenis@greatpearlcoffee.com',
  'godwinmukobi@greatpearlcoffee.com'
]
```

### Query
```typescript
const { data: employees } = await supabase
  .from('employees')
  .select('id, name, phone, email')
  .in('email', approverEmails)
  .not('phone', 'is', null)
```

## SMS Message Format

Each of the 3 approvers receives:

```
Dear [Approver Name], [Requester Name] has requested approval for [Request Type] of UGX [Amount]. Please review and approve/reject in the Finance Portal.
```

Example:
```
Dear Mukobi Godwin, John Doe has requested approval for Salary Request of UGX 500,000. Please review and approve/reject in the Finance Portal.
```

## Who Does NOT Receive Notifications

All other employees, including:
- Other Administrators (Kelvis Fauza, Musema Wyclif, supera dmin)
- Quality Managers (Tumwine Alex, Morjalia Jadens)
- All other users with approval permissions

## SMS Costs

### Per Request
- 3 SMS messages per approval request
- Fixed cost regardless of number of employees in system

### Comparison
- Previous dynamic system: 10 SMS per request
- Current hardcoded system: 3 SMS per request
- **Savings: 70% reduction in SMS volume**

## To Add/Remove Approvers

Edit the `approverEmails` array in `src/hooks/useApprovalSystem.ts`:

```typescript
const approverEmails = [
  'fauzakusa@greatpearlcoffee.com',        // Fauza Kusa 2
  'bwambaledenis@greatpearlcoffee.com',    // bwambale denis
  'godwinmukobi@greatpearlcoffee.com'      // Mukobi Godwin
  // Add new emails here
]
```

Then rebuild the application:
```bash
npm run build
```

## Advantages of Hardcoded Approach

1. **Predictable SMS costs** - Always 3 SMS per request
2. **Simplified logic** - No complex permission checking
3. **Clear responsibility** - Only 3 people handle approvals
4. **Faster queries** - Direct email lookup instead of permission filtering

## Disadvantages

1. **Requires code changes** - Adding/removing approvers needs rebuild
2. **No flexibility** - Cannot adjust based on roles/permissions
3. **Single point of failure** - If all 3 are unavailable, no one gets notified
4. **Maintenance overhead** - Email changes require code updates

## Date Implemented
March 3, 2026

## Last Updated
March 3, 2026

# Great Pearl Finance Department Management System

A dedicated finance portal for Great Pearl Coffee that connects to the same Supabase database as the main traceability system.

## Overview

This is a standalone finance application built with React, TypeScript, and Vite that provides the Finance Department with dedicated tools for managing:

- Coffee payments to suppliers
- Supplier advances and recoveries
- Cash management and daily float
- Expense approval workflows
- HR salary payments
- Financial reports and analytics

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Database**: Supabase (shared with main traceability system)
- **Icons**: Lucide React

## Features Implemented

### 1. Authentication & Authorization
- Supabase email/password authentication
- Role-based access control (5 levels: Super Admin, Manager, Administrator, Supervisor, User)
- Finance department access restrictions
- Protected routes with permission gates

### 2. Dashboard
- Real-time KPI cards showing:
  - Pending coffee payments
  - Available cash balance
  - Outstanding supplier advances
  - Net cash position
  - Pending expense requests
  - Today's completed transactions
- Quick action links to key modules
- Recent activity feed

### 3. Coffee Payments Module
- View pending, partially paid, and completed coffee lots
- Search and filter by supplier or batch number
- Process payments with multiple payment methods (cash, mobile money, bank transfer, cheque)
- Automatic advance deduction calculation
- Export to CSV functionality
- Real-time updates to finance tables

### 4. Supplier Advances Module
- Track advances given to suppliers
- Monitor recovered amounts
- Calculate outstanding balances

### 5. Cash Management Module
- Daily cash float management
- Transaction tracking
- Cash balance reconciliation

### 6. Expenses Module
- View and approve expense requests
- Track expense categories and departments
- Generate expense reports

### 7. HR Payments Module
- Process employee salary payments
- Handle allowance payments
- Payment history tracking

### 8. Reports Module
- Monthly finance summaries
- Day book reports
- Expense analysis by category/department
- Export capabilities

### 9. Settings
- Finance-specific configurations
- Accessible only to Super Admin, Manager, and Administrator roles

## Database Structure

The system uses the following Supabase tables:

### Finance Tables
- `finance_coffee_lots` - Coffee lots pending payment
- `finance_payments` - Payment records
- `finance_cash_transactions` - Cash in/out tracking
- `finance_cash_balance` - Daily cash balances
- `finance_advances` - Supplier advance tracking
- `finance_expenses` - Expense records
- `finance_ledgers` - General ledger entries
- `finance_transactions` - All financial transactions

### Operational Tables
- `employees` - Employee records with roles and permissions
- `suppliers` - Supplier information
- `approval_requests` - Expense and payment approvals
- `coffee_records` - Coffee procurement records

## Role-Based Access Control

### Super Admin
- Full access to all features
- Can delete records
- Can access all reports
- Can modify system settings

### Manager
- Full access to finance module
- Can approve payments and expenses
- Can export and print reports
- Cannot delete certain critical records

### Administrator
- Strong access to finance operations
- Can approve most transactions
- Limited delete permissions

### Supervisor
- Can view and process transactions
- Limited approval authority
- Cannot delete records

### User
- View-only access to most features
- Can submit requests
- Cannot approve or delete

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account with access to Great Pearl database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## File Structure

```
src/
├── components/
│   ├── Layout.tsx              # Main layout with sidebar
│   ├── Navigation.tsx          # Finance module navigation
│   ├── ProtectedRoute.tsx      # Route protection wrapper
│   └── PermissionGate.tsx      # Permission-based rendering
├── contexts/
│   └── AuthContext.tsx         # Authentication & user context
├── hooks/
│   └── useFinanceStats.ts      # Finance statistics hook
├── lib/
│   ├── supabaseClient.ts       # Supabase client configuration
│   └── utils.ts                # Utility functions (formatting, export)
├── pages/
│   ├── Dashboard.tsx           # Finance dashboard
│   ├── Login.tsx               # Authentication page
│   ├── CoffeePayments.tsx      # Coffee payment processing
│   ├── SupplierAdvances.tsx    # Advance management
│   ├── CashManagement.tsx      # Cash float & transactions
│   ├── Expenses.tsx            # Expense approvals
│   ├── HRPayments.tsx          # Salary payments
│   ├── Reports.tsx             # Financial reports
│   └── Settings.tsx            # System settings
├── App.tsx                     # Main app with routing
└── main.tsx                    # App entry point
```

## Key Features

### Payment Processing Flow
1. Finance views pending coffee lots in Coffee Payments module
2. Selects lot and clicks "Process Payment"
3. Modal opens with:
   - Lot details (kilograms, price, total)
   - Automatic advance deduction
   - Net amount calculation
4. Finance enters:
   - Payment method
   - Actual amount paid
   - Reference number
   - Optional notes
5. System:
   - Creates payment record in `finance_payments`
   - Updates lot status in `finance_coffee_lots`
   - Records cash transaction in `finance_cash_transactions`
   - Updates cash balance

### Security Features
- JWT-based authentication via Supabase
- Role-based UI rendering (buttons show/hide based on permissions)
- Protected routes with automatic redirects
- Department-level access control
- Permission gates for sensitive actions

### Data Export
- CSV export functionality on all list views
- Filtered exports (by status, date range, etc.)
- Formatted data ready for Excel/Sheets

## API Integration

All data operations use Supabase client:
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data access control
- Optimistic updates for better UX
- Error handling and user feedback

## Future Enhancements

1. **Full PDF Export**: Add PDF generation for reports and receipts
2. **Advanced Analytics**: Charts and graphs for financial trends
3. **Budget Management**: Track budgets vs actual spending
4. **Audit Trail**: Complete audit log for all financial transactions
5. **Mobile App**: React Native mobile version
6. **Offline Support**: PWA with offline capabilities
7. **Multi-currency**: Support for multiple currencies
8. **Automated Reports**: Scheduled report generation and email delivery
9. **Integration**: Connect with accounting software (QuickBooks, Xero)
10. **Advanced Search**: Full-text search across all financial records

## Support

For issues or questions, contact the IT Department at Great Pearl Coffee.

## License

Proprietary - Great Pearl Coffee 2024

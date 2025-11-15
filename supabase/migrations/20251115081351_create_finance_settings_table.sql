/*
  # Finance Settings Table

  1. New Tables
    - `finance_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting key name
      - `value` (jsonb) - Setting value (flexible for different data types)
      - `category` (text) - Group settings by category (cash, approvals, advances, etc.)
      - `description` (text) - Human-readable description
      - `updated_by` (text) - Email of user who last updated
      - `updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz) - Creation timestamp

    - `expense_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `description` (text) - Category description
      - `cost_centre` (text) - Cost centre code
      - `is_active` (boolean) - Whether category is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Finance users can read all settings
    - Only finance users can update settings
    - Admin users can also manage settings

  3. Default Settings
    - Insert default configuration values
*/

-- Create finance_settings table
CREATE TABLE IF NOT EXISTS finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL,
  description text,
  updated_by text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  cost_centre text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_settings
CREATE POLICY "Finance users can read settings"
  ON finance_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  );

CREATE POLICY "Finance users can update settings"
  ON finance_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  );

CREATE POLICY "Finance users can insert settings"
  ON finance_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  );

-- RLS Policies for expense_categories
CREATE POLICY "Finance users can read expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  );

CREATE POLICY "Finance users can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.email = auth.jwt()->>'email'
      AND employees.department IN ('Finance', 'Admin')
    )
  );

-- Insert default settings
INSERT INTO finance_settings (key, value, category, description) VALUES
  -- Cash & Balancing
  ('cash_opening_source', '{"value": "last_closing"}', 'cash', 'Default opening cash source: last_closing or manual'),
  ('allow_negative_balance', '{"value": false}', 'cash', 'Allow negative cash balance'),
  ('cash_warning_threshold', '{"value": 10000}', 'cash', 'Warn if cash imbalance exceeds this amount'),
  ('currency', '{"value": "UGX", "format": "1,000"}', 'cash', 'Currency and number format'),
  
  -- Approvals
  ('approval_flow_mode', '{"value": "normal"}', 'approvals', 'Approval flow: normal (Finance → Admin)'),
  ('require_finance_before_admin', '{"value": true}', 'approvals', 'Require Finance review before Admin approval'),
  ('expense_final_approver', '{"value": "Admin"}', 'approvals', 'Final approver for expense requests'),
  ('requisition_final_approver', '{"value": "Admin"}', 'approvals', 'Final approver for requisitions'),
  ('salary_final_approver', '{"value": "GM"}', 'approvals', 'Final approver for salary requests'),
  
  -- Advances
  ('max_advance_percentage', '{"value": 30}', 'advances', 'Max advance as % of average monthly deliveries'),
  ('auto_recover_advances', '{"value": true}', 'advances', 'Automatically recover advances from payments'),
  ('advance_recovery_percentage', '{"value": 30}', 'advances', 'Default % of payment to recover advance'),
  ('allow_advance_with_arrears', '{"value": false}', 'advances', 'Allow advances when supplier has outstanding balance'),
  ('minimum_advance_amount', '{"value": 50000}', 'advances', 'Minimum advance amount'),
  
  -- Payments
  ('payment_rounding', '{"value": "nearest_100"}', 'payments', 'Rounding rule: exact, nearest_100, down_100'),
  ('payment_methods', '{"value": ["Cash", "Mobile Money", "Bank Transfer", "Cheque"]}', 'payments', 'Allowed payment methods'),
  ('default_payment_method', '{"value": "Mobile Money"}', 'payments', 'Default payment method'),
  ('require_payment_reference', '{"value": true}', 'payments', 'Require payment reference/transaction ID'),
  
  -- Notifications
  ('notify_new_expense', '{"value": ["Finance", "Admin"]}', 'notifications', 'Notify on new expense request'),
  ('notify_finance_approval', '{"value": ["Admin"]}', 'notifications', 'Notify after finance approval'),
  ('notify_final_approval', '{"value": ["Requester", "Finance"]}', 'notifications', 'Notify after final approval'),
  ('sms_on_cash_imbalance', '{"value": false}', 'notifications', 'Send SMS on cash imbalance'),
  ('sms_approval_template', '{"value": "Dear {name}, your {type} of UGX {amount} has been approved. Ref: {ref}. Great Pearl Coffee."}', 'notifications', 'SMS template for approvals'),
  ('sms_rejection_template', '{"value": "Dear {name}, your {type} request of UGX {amount} was rejected. Reason: {reason}. Great Pearl Coffee."}', 'notifications', 'SMS template for rejections'),
  
  -- Reports
  ('default_report_period', '{"value": "current_month"}', 'reports', 'Default reporting period'),
  ('finance_month_closing_date', '{"value": 28}', 'reports', 'Finance month closing date (day of month)'),
  ('allow_edits_after_close', '{"value": false}', 'reports', 'Allow edits after month close'),
  ('finance_report_email', '{"value": "finance@greatpearlcoffee.com"}', 'reports', 'Email for automatic report delivery')

ON CONFLICT (key) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description, cost_centre) VALUES
  ('Fuel', 'Fuel and petroleum products', '101'),
  ('Transport', 'Transportation and logistics', '101'),
  ('Maintenance', 'Equipment and facility maintenance', '102'),
  ('Staff Welfare', 'Staff welfare and benefits', '100'),
  ('Rent', 'Property rent and leases', '100'),
  ('Utilities', 'Water, electricity, internet', '100'),
  ('Interest', 'Loan interest payments', '100'),
  ('Office Supplies', 'Stationery and office supplies', '100'),
  ('Professional Fees', 'Legal, accounting, consulting fees', '100'),
  ('Marketing', 'Marketing and advertising', '103'),
  ('Insurance', 'Insurance premiums', '100'),
  ('Taxes and Licenses', 'Government taxes and licenses', '100')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_finance_settings_category ON finance_settings(category);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_cost_centre ON expense_categories(cost_centre);
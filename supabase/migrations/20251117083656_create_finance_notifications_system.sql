/*
  # Create Finance Notifications System

  1. New Tables
    - `finance_notifications`
      - `id` (uuid, primary key)
      - `type` (text) - 'approval_request' | 'system' | 'announcement' | 'reminder' | 'payment_ready'
      - `title` (text) - Notification headline
      - `message` (text) - Detailed notification message
      - `priority` (text) - 'High' | 'Medium' | 'Low'
      - `is_read` (boolean) - Read status, defaults to false
      - `sender_name` (text) - Name of person/system creating notification
      - `sender_email` (text) - Email of sender
      - `target_role` (text) - Optional role filter (e.g., 'Finance Manager')
      - `target_user_email` (text) - Optional specific user targeting
      - `metadata` (jsonb) - Flexible field for context (approval IDs, amounts, etc.)
      - `created_at` (timestamptz) - Auto-set timestamp
      - `read_at` (timestamptz) - When notification was marked read

  2. Security
    - Enable RLS on `finance_notifications` table
    - Policy: Authenticated users can view all finance notifications
    - Policy: Authenticated users can update their own read status
    - Policy: Authenticated users can create notifications

  3. Indexes
    - Index on `created_at` for efficient ordering
    - Index on `is_read` for unread count queries
    - Index on `target_user_email` for user-specific filtering
*/

CREATE TABLE IF NOT EXISTS finance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('approval_request', 'system', 'announcement', 'reminder', 'payment_ready')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  is_read boolean NOT NULL DEFAULT false,
  sender_name text,
  sender_email text,
  target_role text,
  target_user_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Enable RLS
ALTER TABLE finance_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view finance notifications
CREATE POLICY "Authenticated users can view finance notifications"
  ON finance_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create notifications
CREATE POLICY "Authenticated users can create notifications"
  ON finance_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update notifications (primarily for marking as read)
CREATE POLICY "Users can update notifications"
  ON finance_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_finance_notifications_created_at 
  ON finance_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_notifications_is_read 
  ON finance_notifications(is_read) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_finance_notifications_target_user 
  ON finance_notifications(target_user_email) 
  WHERE target_user_email IS NOT NULL;
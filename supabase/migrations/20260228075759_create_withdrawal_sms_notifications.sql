/*
  # Create SMS Notification System for Withdrawals

  1. New Table
    - `sms_notification_queue`
      - `id` (uuid, primary key)
      - `recipient_phone` (text) - Phone number to send SMS to
      - `recipient_email` (text) - Email of recipient (for lookup)
      - `message` (text) - SMS message content
      - `notification_type` (text) - 'withdrawal_approved', 'withdrawal_rejected', etc.
      - `status` (text) - 'pending', 'sent', 'failed'
      - `reference_id` (uuid) - Reference to money_request or other record
      - `sent_at` (timestamptz) - When SMS was sent
      - `error_message` (text) - Error details if failed
      - `created_at` (timestamptz)

  2. Trigger Functions
    - Automatically create SMS notifications on withdrawal approval/rejection
    - Queue SMS for external processing (e.g., via edge function)

  3. Purpose
    - Track all SMS notifications for audit
    - Provide queue for SMS gateway integration
    - Support retry logic for failed SMS

  4. Security
    - Enable RLS
    - Authenticated users can view their own notifications
    - System can insert notifications via trigger
*/

CREATE TABLE IF NOT EXISTS sms_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone text,
  recipient_email text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('withdrawal_approved', 'withdrawal_rejected', 'withdrawal_admin_approved', 'withdrawal_submitted')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  reference_id uuid,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS notifications"
  ON sms_notification_queue
  FOR SELECT
  TO authenticated
  USING (recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can insert SMS notifications"
  ON sms_notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update SMS notifications"
  ON sms_notification_queue
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_notification_queue(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sms_queue_recipient ON sms_notification_queue(recipient_email);

CREATE OR REPLACE FUNCTION notify_withdrawal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_phone text;
  sms_message text;
  notification_type_val text;
BEGIN
  IF NEW.request_type != 'withdrawal' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT phone_number INTO user_phone
  FROM employees
  WHERE email = NEW.requested_by
  LIMIT 1;

  IF user_phone IS NULL THEN
    user_phone = COALESCE(NEW.phone_number, '');
  END IF;

  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    notification_type_val = 'withdrawal_approved';
    sms_message = format(
      'Your withdrawal request of %s UGX has been APPROVED. Payment will be processed via %s. - Great Pearl Coffee',
      NEW.amount,
      CASE 
        WHEN NEW.payment_channel = 'MOBILE_MONEY' THEN 'Mobile Money'
        WHEN NEW.payment_channel = 'BANK' THEN 'Bank Transfer'
        ELSE 'Cash (collect from office)'
      END
    );
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    notification_type_val = 'withdrawal_rejected';
    sms_message = format(
      'Your withdrawal request of %s UGX has been REJECTED. Reason: %s - Great Pearl Coffee',
      NEW.amount,
      COALESCE(NEW.rejection_reason, 'No reason provided')
    );
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO sms_notification_queue (
    recipient_phone,
    recipient_email,
    message,
    notification_type,
    reference_id
  ) VALUES (
    user_phone,
    NEW.requested_by,
    sms_message,
    notification_type_val,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_withdrawal_status_trigger ON money_requests;
CREATE TRIGGER notify_withdrawal_status_trigger
  AFTER UPDATE OF status
  ON money_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_withdrawal_status_change();

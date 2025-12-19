/*
  # Add phone number and payment channel to money_requests

  1. Changes
    - Add `phone_number` column to store mobile money phone numbers
    - Add `payment_channel` column to specify payment method (CASH or MOBILE_MONEY)
    - Both columns support the withdrawal request management workflow
  
  2. Details
    - `phone_number` is optional (text, nullable)
    - `payment_channel` defaults to 'CASH'
    - These fields enable finance team to process payments via different channels
*/

ALTER TABLE public.money_requests
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS payment_channel text DEFAULT 'CASH';
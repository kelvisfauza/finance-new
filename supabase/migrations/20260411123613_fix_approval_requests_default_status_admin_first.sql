/*
  # Fix approval_requests default status to Pending Admin

  The approval workflow has changed: Admin now approves first, then Finance releases cash.
  This migration updates the default status on the approval_requests table to reflect
  the new flow where new requests start as 'Pending Admin' instead of 'Pending Finance'.
*/

ALTER TABLE approval_requests
  ALTER COLUMN status SET DEFAULT 'Pending Admin';

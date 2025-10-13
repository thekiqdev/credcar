-- Migration: Add payment tracking fields to withdrawal_requests table
-- Description: Adds payment_status and payment_date fields to track commission payments

-- Add payment_status enum type
CREATE TYPE payment_status AS ENUM ('Não Pago', 'Pago');

-- Add new columns to withdrawal_requests table
ALTER TABLE withdrawal_requests
ADD COLUMN payment_status payment_status DEFAULT 'Não Pago',
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_status 
ON withdrawal_requests (payment_status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_date 
ON withdrawal_requests (payment_date);

-- Add comment to document the new fields
COMMENT ON COLUMN withdrawal_requests.payment_status IS 'Status do pagamento da comissão: Não Pago ou Pago';
COMMENT ON COLUMN withdrawal_requests.payment_date IS 'Data em que a comissão foi marcada como paga';

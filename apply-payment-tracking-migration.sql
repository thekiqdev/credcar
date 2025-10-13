-- Migration: Add payment tracking fields to withdrawal_requests table
-- Execute this SQL directly in the Supabase SQL Editor

-- Add payment_status enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('Não Pago', 'Pago');
    END IF;
END $$;

-- Add new columns to withdrawal_requests table
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'Não Pago',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance on payment queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_status 
ON withdrawal_requests (payment_status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_date 
ON withdrawal_requests (payment_date);

-- Add comments to document the new fields
COMMENT ON COLUMN withdrawal_requests.payment_status IS 'Status do pagamento da comissão: Não Pago ou Pago';
COMMENT ON COLUMN withdrawal_requests.payment_date IS 'Data em que a comissão foi marcada como paga';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'withdrawal_requests' 
AND column_name IN ('payment_status', 'payment_date');

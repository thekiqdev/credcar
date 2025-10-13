-- Apply contract_profile migration to profiles table
-- This script adds the contract_profile field to store representative contract download links

-- Add contract_profile field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS contract_profile TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile ON profiles (contract_profile);

-- Add comment for documentation
COMMENT ON COLUMN profiles.contract_profile IS 'Link para download do contrato do representante';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'contract_profile';

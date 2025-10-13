-- Add contract_profile field to profiles table
-- This field will store the download link for the representative contract

ALTER TABLE profiles
ADD COLUMN contract_profile TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile ON profiles (contract_profile);

-- Add comment for documentation
COMMENT ON COLUMN profiles.contract_profile IS 'Link para download do contrato do representante';

-- Add is_private column to groups table
ALTER TABLE groups
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_is_private ON groups (is_private);

-- Add comment for documentation
COMMENT ON COLUMN groups.is_private IS 'Define se o grupo é privado (apenas admin pode selecionar) ou público';


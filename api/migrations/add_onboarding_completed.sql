-- Add onboarding_completed column to users table
-- This column tracks whether a user has completed the onboarding tutorial

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE users
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT false NOT NULL;

        -- Add comment for documentation
        COMMENT ON COLUMN users.onboarding_completed IS 'Indicates whether the user has completed the onboarding tutorial';

        -- Create index for efficient queries
        CREATE INDEX idx_users_onboarding_completed ON users(onboarding_completed) WHERE onboarding_completed = false;

        RAISE NOTICE 'Column onboarding_completed added successfully';
    ELSE
        RAISE NOTICE 'Column onboarding_completed already exists';
    END IF;
END $$;

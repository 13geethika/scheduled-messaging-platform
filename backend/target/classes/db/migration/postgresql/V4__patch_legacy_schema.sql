-- 1. Patch users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='version') THEN
        ALTER TABLE users ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='deleted') THEN
        ALTER TABLE users ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_modified_date') THEN
        ALTER TABLE users ADD COLUMN last_modified_date TIMESTAMP DEFAULT NULL;
    END IF;
END $$;

-- 2. Patch contacts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='deleted') THEN
        ALTER TABLE contacts ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 3. Patch messages table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='version') THEN
        ALTER TABLE messages ADD COLUMN version INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='deleted') THEN
        ALTER TABLE messages ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='created_by') THEN
        ALTER TABLE messages ADD COLUMN created_by VARCHAR(255) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='last_modified_by') THEN
        ALTER TABLE messages ADD COLUMN last_modified_by VARCHAR(255) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='last_modified_date') THEN
        ALTER TABLE messages ADD COLUMN last_modified_date TIMESTAMP DEFAULT NULL;
    END IF;
END $$;

-- 4. Patch refresh_tokens table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='family_id') THEN
        ALTER TABLE refresh_tokens ADD COLUMN family_id VARCHAR(255) DEFAULT '';
        UPDATE refresh_tokens SET family_id = COALESCE(token, 'legacy-family');
        ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='used') THEN
        ALTER TABLE refresh_tokens ADD COLUMN used BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Drop unique constraint on user_id in refresh_tokens if it exists
DO $$
DECLARE
    constraint_name_val VARCHAR(255);
BEGIN
    SELECT con.conname INTO constraint_name_val
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'refresh_tokens' 
      AND con.contype = 'u'
      AND con.conkey = ARRAY[
          (SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'user_id')
      ];

    IF constraint_name_val IS NOT NULL THEN
        EXECUTE 'ALTER TABLE refresh_tokens DROP CONSTRAINT ' || quote_ident(constraint_name_val);
    END IF;
END $$;

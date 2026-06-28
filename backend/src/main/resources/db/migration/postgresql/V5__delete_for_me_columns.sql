DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='deleted_by_sender') THEN
        ALTER TABLE messages ADD COLUMN deleted_by_sender BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='deleted_by_receiver') THEN
        ALTER TABLE messages ADD COLUMN deleted_by_receiver BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

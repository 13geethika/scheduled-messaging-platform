-- Flyway Migration: Update groups membership and permissions
ALTER TABLE chat_groups ADD COLUMN admins_only_messaging BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_groups ADD COLUMN group_photo_url VARCHAR(512) DEFAULT NULL;

ALTER TABLE group_members ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'MEMBER';
ALTER TABLE group_members ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE group_members ADD COLUMN joined_at TIMESTAMP NULL DEFAULT NULL;

-- Migrate existing group creators to ADMIN and ACCEPTED
UPDATE group_members
SET role = 'ADMIN', status = 'ACCEPTED', joined_at = chat_groups.created_at
FROM chat_groups
WHERE group_members.group_id = chat_groups.id AND group_members.user_id = chat_groups.created_by_id;

-- Migrate other existing group members to ACCEPTED
UPDATE group_members
SET role = 'MEMBER', status = 'ACCEPTED', joined_at = chat_groups.created_at
FROM chat_groups
WHERE group_members.group_id = chat_groups.id AND group_members.user_id <> chat_groups.created_by_id;

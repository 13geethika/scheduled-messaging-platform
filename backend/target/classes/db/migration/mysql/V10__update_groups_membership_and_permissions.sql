-- Flyway Migration: Update groups membership and permissions
ALTER TABLE chat_groups ADD COLUMN admins_only_messaging BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_groups ADD COLUMN group_photo_url VARCHAR(512) DEFAULT NULL;

ALTER TABLE group_members ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'MEMBER';
ALTER TABLE group_members ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE group_members ADD COLUMN joined_at TIMESTAMP NULL DEFAULT NULL;

-- Migrate existing group creators to ADMIN and ACCEPTED
UPDATE group_members gm
JOIN chat_groups cg ON gm.group_id = cg.id
SET gm.role = 'ADMIN', gm.status = 'ACCEPTED', gm.joined_at = cg.created_at
WHERE gm.user_id = cg.created_by_id;

-- Migrate other existing group members to ACCEPTED
UPDATE group_members gm
JOIN chat_groups cg ON gm.group_id = cg.id
SET gm.role = 'MEMBER', gm.status = 'ACCEPTED', gm.joined_at = cg.created_at
WHERE gm.user_id <> cg.created_by_id;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    actor VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(100) DEFAULT NULL,
    action_details TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dead_letter_messages (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    receiver_email VARCHAR(255) NOT NULL,
    content TEXT,
    error_reason TEXT,
    failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -- --------------------------------------------------------
-- -- Business Tables
-- -- --------------------------------------------------------
--
-- CREATE TABLE IF NOT EXISTS users (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) NOT NULL UNIQUE,
--     password VARCHAR(255) NOT NULL,
--     role VARCHAR(50) NOT NULL,
--     status VARCHAR(50) NOT NULL,
--     failed_attempts INT NOT NULL DEFAULT 0,
--     locked_until DATETIME DEFAULT NULL,
--     email_verification_token VARCHAR(255) DEFAULT NULL,
--     password_reset_token VARCHAR(255) DEFAULT NULL,
--     created_at DATETIME NOT NULL
-- );
--
-- CREATE TABLE IF NOT EXISTS contacts (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     user_id BIGINT NOT NULL,
--     contact_user_id BIGINT NOT NULL,
--     status VARCHAR(50) NOT NULL,
--     created_at DATETIME NOT NULL,
--     UNIQUE KEY unique_user_contact (user_id, contact_user_id),
--     CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--     CONSTRAINT fk_contacts_contact_user FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
-- );
--
-- CREATE TABLE IF NOT EXISTS messages (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     sender_id BIGINT NOT NULL,
--     receiver_id BIGINT NOT NULL,
--     content TEXT DEFAULT NULL,
--     message_type VARCHAR(50) NOT NULL,
--     file_url VARCHAR(500) DEFAULT NULL,
--     status VARCHAR(50) NOT NULL,
--     scheduled_time DATETIME DEFAULT NULL,
--     sent_time DATETIME DEFAULT NULL,
--     recurring_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
--     retry_count INT NOT NULL DEFAULT 0,
--     max_retries INT NOT NULL DEFAULT 3,
--     error_message TEXT DEFAULT NULL,
--     created_at DATETIME NOT NULL,
--     CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
--     CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
-- );
--
-- CREATE TABLE IF NOT EXISTS notifications (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     user_id BIGINT NOT NULL,
--     message VARCHAR(500) NOT NULL,
--     status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
--     created_at DATETIME NOT NULL,
--     CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );
--
-- CREATE TABLE IF NOT EXISTS refresh_tokens (
--     id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     user_id BIGINT NOT NULL UNIQUE,
--     token VARCHAR(255) NOT NULL UNIQUE,
--     expiry_date TIMESTAMP NOT NULL,
--     CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );
--
-- -- --------------------------------------------------------
-- -- Quartz Scheduler Tables for MySQL
-- -- --------------------------------------------------------
--
-- CREATE TABLE IF NOT EXISTS QRTZ_JOB_DETAILS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     JOB_NAME VARCHAR(190) NOT NULL,
--     JOB_GROUP VARCHAR(190) NOT NULL,
--     DESCRIPTION VARCHAR(250) NULL,
--     JOB_CLASS_NAME VARCHAR(250) NOT NULL,
--     IS_DURABLE VARCHAR(1) NOT NULL,
--     IS_NONCONCURRENT VARCHAR(1) NOT NULL,
--     IS_UPDATE_DATA VARCHAR(1) NOT NULL,
--     REQUESTS_RECOVERY VARCHAR(1) NOT NULL,
--     JOB_DATA BLOB NULL,
--     PRIMARY KEY (SCHED_NAME, JOB_NAME, JOB_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     JOB_NAME VARCHAR(190) NOT NULL,
--     JOB_GROUP VARCHAR(190) NOT NULL,
--     DESCRIPTION VARCHAR(250) NULL,
--     NEXT_FIRE_TIME BIGINT(13) NULL,
--     PREV_FIRE_TIME BIGINT(13) NULL,
--     PRIORITY INTEGER NULL,
--     TRIGGER_STATE VARCHAR(16) NOT NULL,
--     TRIGGER_TYPE VARCHAR(8) NOT NULL,
--     START_TIME BIGINT(13) NOT NULL,
--     END_TIME BIGINT(13) NULL,
--     CALENDAR_NAME VARCHAR(190) NULL,
--     MISFIRE_INSTR SMALLINT(2) NULL,
--     JOB_DATA BLOB NULL,
--     PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     FOREIGN KEY (SCHED_NAME, JOB_NAME, JOB_GROUP)
--         REFERENCES QRTZ_JOB_DETAILS(SCHED_NAME, JOB_NAME, JOB_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_SIMPLE_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     REPEAT_COUNT BIGINT(7) NOT NULL,
--     REPEAT_INTERVAL BIGINT(12) NOT NULL,
--     TIMES_TRIGGERED BIGINT(10) NOT NULL,
--     PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
--         REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_CRON_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     CRON_EXPRESSION VARCHAR(120) NOT NULL,
--     TIME_ZONE_ID VARCHAR(80),
--     PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
--         REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_SIMPROP_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     STR_PROP_1 VARCHAR(512) NULL,
--     STR_PROP_2 VARCHAR(512) NULL,
--     STR_PROP_3 VARCHAR(512) NULL,
--     INT_PROP_1 INT NULL,
--     INT_PROP_2 INT NULL,
--     LONG_PROP_1 BIGINT NULL,
--     LONG_PROP_2 BIGINT NULL,
--     DEC_PROP_1 NUMERIC(13,4) NULL,
--     DEC_PROP_2 NUMERIC(13,4) NULL,
--     BOOL_PROP_1 VARCHAR(1) NULL,
--     BOOL_PROP_2 VARCHAR(1) NULL,
--     PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
--         REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_BLOB_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     BLOB_DATA BLOB NULL,
--     PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     INDEX (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
--     FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
--         REFERENCES QRTZ_TRIGGERS(SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_CALENDARS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     CALENDAR_NAME VARCHAR(190) NOT NULL,
--     CALENDAR BLOB NOT NULL,
--     PRIMARY KEY (SCHED_NAME, CALENDAR_NAME)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_PAUSED_TRIGGER_GRPS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     PRIMARY KEY (SCHED_NAME, TRIGGER_GROUP)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_FIRED_TRIGGERS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     ENTRY_ID VARCHAR(95) NOT NULL,
--     TRIGGER_NAME VARCHAR(190) NOT NULL,
--     TRIGGER_GROUP VARCHAR(190) NOT NULL,
--     INSTANCE_NAME VARCHAR(190) NOT NULL,
--     FIRED_TIME BIGINT(13) NOT NULL,
--     SCHED_TIME BIGINT(13) NOT NULL,
--     PRIORITY INTEGER NOT NULL,
--     STATE VARCHAR(16) NOT NULL,
--     JOB_NAME VARCHAR(190) NULL,
--     JOB_GROUP VARCHAR(190) NULL,
--     IS_NONCONCURRENT VARCHAR(1) NULL,
--     REQUESTS_RECOVERY VARCHAR(1) NULL,
--     PRIMARY KEY (SCHED_NAME, ENTRY_ID)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_SCHEDULER_STATE (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     INSTANCE_NAME VARCHAR(190) NOT NULL,
--     LAST_CHECKIN_TIME BIGINT(13) NOT NULL,
--     CHECKIN_INTERVAL BIGINT(13) NOT NULL,
--     PRIMARY KEY (SCHED_NAME, INSTANCE_NAME)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS QRTZ_LOCKS (
--     SCHED_NAME VARCHAR(120) NOT NULL,
--     LOCK_NAME VARCHAR(40) NOT NULL,
--     PRIMARY KEY (SCHED_NAME, LOCK_NAME)
-- ) ENGINE=InnoDB;
--
-- CREATE INDEX idx_qrtz_j_req_recovery ON QRTZ_JOB_DETAILS(SCHED_NAME,REQUESTS_RECOVERY);
-- CREATE INDEX idx_qrtz_j_grp ON QRTZ_JOB_DETAILS(SCHED_NAME,JOB_GROUP);
-- CREATE INDEX idx_qrtz_t_next_fire_time ON QRTZ_TRIGGERS(SCHED_NAME,NEXT_FIRE_TIME);
-- CREATE INDEX idx_qrtz_t_state ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_STATE);
-- CREATE INDEX idx_qrtz_t_nft_state ON QRTZ_TRIGGERS(SCHED_NAME,NEXT_FIRE_TIME,TRIGGER_STATE);
-- CREATE INDEX idx_qrtz_t_nft_misfire ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME);
-- CREATE INDEX idx_qrtz_t_nft_state_misfire ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME,TRIGGER_STATE);
-- CREATE INDEX idx_qrtz_t_nft_state_misfire_grp ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME,TRIGGER_GROUP,TRIGGER_STATE);
-- CREATE INDEX idx_qrtz_t_state_grp ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_GROUP,TRIGGER_STATE);
-- CREATE INDEX idx_qrtz_t_j ON QRTZ_TRIGGERS(SCHED_NAME,JOB_NAME,JOB_GROUP);
-- CREATE INDEX idx_qrtz_t_c ON QRTZ_TRIGGERS(SCHED_NAME,CALENDAR_NAME);
-- CREATE INDEX idx_qrtz_ft_trig_inst_name ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,INSTANCE_NAME);
-- CREATE INDEX idx_qrtz_ft_inst_job_req_rcvry ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,INSTANCE_NAME,REQUESTS_RECOVERY);
-- CREATE INDEX idx_qrtz_ft_j_g ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,JOB_NAME,JOB_GROUP);
-- CREATE INDEX idx_qrtz_ft_jg ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,JOB_GROUP);
-- CREATE INDEX idx_qrtz_ft_t_g ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP);
-- CREATE INDEX idx_qrtz_ft_tg ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,TRIGGER_GROUP);
--
-- -- Migration to allow null scheduled_time for direct chat messages
-- ALTER TABLE messages MODIFY scheduled_time DATETIME DEFAULT NULL;



#psql
-- -------------------------------------------------------
-- =========================================================
-- USERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- =========================================================
-- CONTACTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS contacts (
                                        id BIGSERIAL PRIMARY KEY,
                                        user_id BIGINT NOT NULL,
                                        contact_user_id BIGINT NOT NULL,
                                        status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_contact UNIQUE (user_id, contact_user_id),

    CONSTRAINT fk_contacts_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_contacts_contact_user
    FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- =========================================================
-- MESSAGES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
                                        id BIGSERIAL PRIMARY KEY,
                                        sender_id BIGINT NOT NULL,
                                        receiver_id BIGINT NOT NULL,
                                        content TEXT,
                                        message_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500),
    status VARCHAR(50) NOT NULL,
    scheduled_time TIMESTAMP,
    sent_time TIMESTAMP,
    recurring_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- =========================================================
-- NOTIFICATIONS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
                                             id BIGSERIAL PRIMARY KEY,
                                             user_id BIGINT NOT NULL,
                                             message VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- =========================================================
-- REFRESH TOKENS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id BIGSERIAL PRIMARY KEY,
                                              user_id BIGINT NOT NULL UNIQUE,
                                              token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,

    CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- =========================================================
-- QUARTZ JOB DETAILS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_job_details (
                                                sched_name VARCHAR(120) NOT NULL,
    job_name VARCHAR(190) NOT NULL,
    job_group VARCHAR(190) NOT NULL,
    description VARCHAR(250),
    job_class_name VARCHAR(250) NOT NULL,
    is_durable BOOLEAN NOT NULL,
    is_nonconcurrent BOOLEAN NOT NULL,
    is_update_data BOOLEAN NOT NULL,
    requests_recovery BOOLEAN NOT NULL,
    job_data BYTEA,

    PRIMARY KEY (sched_name, job_name, job_group)
    );

-- =========================================================
-- QUARTZ TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_triggers (
                                             sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    job_name VARCHAR(190) NOT NULL,
    job_group VARCHAR(190) NOT NULL,
    description VARCHAR(250),
    next_fire_time BIGINT,
    prev_fire_time BIGINT,
    priority INTEGER,
    trigger_state VARCHAR(16) NOT NULL,
    trigger_type VARCHAR(8) NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    calendar_name VARCHAR(190),
    misfire_instr SMALLINT,
    job_data BYTEA,

    PRIMARY KEY (sched_name, trigger_name, trigger_group),

    CONSTRAINT fk_triggers_job
    FOREIGN KEY (sched_name, job_name, job_group)
    REFERENCES qrtz_job_details(sched_name, job_name, job_group)
    );

-- =========================================================
-- QUARTZ SIMPLE TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_simple_triggers (
                                                    sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    repeat_count BIGINT NOT NULL,
    repeat_interval BIGINT NOT NULL,
    times_triggered BIGINT NOT NULL,

    PRIMARY KEY (sched_name, trigger_name, trigger_group),

    CONSTRAINT fk_simple_triggers
    FOREIGN KEY (sched_name, trigger_name, trigger_group)
    REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group)
    );

-- =========================================================
-- QUARTZ CRON TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_cron_triggers (
                                                  sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    cron_expression VARCHAR(120) NOT NULL,
    time_zone_id VARCHAR(80),

    PRIMARY KEY (sched_name, trigger_name, trigger_group),

    CONSTRAINT fk_cron_triggers
    FOREIGN KEY (sched_name, trigger_name, trigger_group)
    REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group)
    );

-- =========================================================
-- QUARTZ SIMPROP TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_simprop_triggers (
                                                     sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    str_prop_1 VARCHAR(512),
    str_prop_2 VARCHAR(512),
    str_prop_3 VARCHAR(512),
    int_prop_1 INT,
    int_prop_2 INT,
    long_prop_1 BIGINT,
    long_prop_2 BIGINT,
    dec_prop_1 NUMERIC(13,4),
    dec_prop_2 NUMERIC(13,4),
    bool_prop_1 BOOLEAN,
    bool_prop_2 BOOLEAN,

    PRIMARY KEY (sched_name, trigger_name, trigger_group),

    CONSTRAINT fk_simprop_triggers
    FOREIGN KEY (sched_name, trigger_name, trigger_group)
    REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group)
    );

-- =========================================================
-- QUARTZ BLOB TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_blob_triggers (
                                                  sched_name VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    blob_data BYTEA,

    PRIMARY KEY (sched_name, trigger_name, trigger_group),

    CONSTRAINT fk_blob_triggers
    FOREIGN KEY (sched_name, trigger_name, trigger_group)
    REFERENCES qrtz_triggers(sched_name, trigger_name, trigger_group)
    );

-- =========================================================
-- QUARTZ CALENDARS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_calendars (
                                              sched_name VARCHAR(120) NOT NULL,
    calendar_name VARCHAR(190) NOT NULL,
    calendar BYTEA NOT NULL,

    PRIMARY KEY (sched_name, calendar_name)
    );

-- =========================================================
-- QUARTZ PAUSED GROUPS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_paused_trigger_grps (
                                                        sched_name VARCHAR(120) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,

    PRIMARY KEY (sched_name, trigger_group)
    );

-- =========================================================
-- QUARTZ FIRED TRIGGERS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_fired_triggers (
                                                   sched_name VARCHAR(120) NOT NULL,
    entry_id VARCHAR(95) NOT NULL,
    trigger_name VARCHAR(190) NOT NULL,
    trigger_group VARCHAR(190) NOT NULL,
    instance_name VARCHAR(190) NOT NULL,
    fired_time BIGINT NOT NULL,
    sched_time BIGINT NOT NULL,
    priority INTEGER NOT NULL,
    state VARCHAR(16) NOT NULL,
    job_name VARCHAR(190),
    job_group VARCHAR(190),
    is_nonconcurrent BOOLEAN,
    requests_recovery BOOLEAN,

    PRIMARY KEY (sched_name, entry_id)
    );

-- =========================================================
-- QUARTZ SCHEDULER STATE
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_scheduler_state (
                                                    sched_name VARCHAR(120) NOT NULL,
    instance_name VARCHAR(190) NOT NULL,
    last_checkin_time BIGINT NOT NULL,
    checkin_interval BIGINT NOT NULL,

    PRIMARY KEY (sched_name, instance_name)
    );

-- =========================================================
-- QUARTZ LOCKS
-- =========================================================
CREATE TABLE IF NOT EXISTS qrtz_locks (
                                          sched_name VARCHAR(120) NOT NULL,
    lock_name VARCHAR(40) NOT NULL,

    PRIMARY KEY (sched_name, lock_name)
    );

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_qrtz_triggers_state
    ON qrtz_triggers(sched_name, trigger_state);

CREATE INDEX IF NOT EXISTS idx_qrtz_triggers_next_fire
    ON qrtz_triggers(sched_name, next_fire_time);

CREATE INDEX IF NOT EXISTS idx_qrtz_job_group
    ON qrtz_job_details(sched_name, job_group);
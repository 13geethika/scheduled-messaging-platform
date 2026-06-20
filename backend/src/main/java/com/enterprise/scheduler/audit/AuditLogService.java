package com.enterprise.scheduler.audit;

import java.util.List;

public interface AuditLogService {
    void logEvent(String eventName, String actor, String actionDetails);
    List<AuditLog> getAllAuditLogs();
}

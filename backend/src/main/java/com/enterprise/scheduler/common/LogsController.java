package com.enterprise.scheduler.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
public class LogsController {

    private static final Logger logger = LoggerFactory.getLogger(LogsController.class);
    private static final Path FRONTEND_LOG_PATH = Paths.get("logs", "enterprise-frontend.log");

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> logClientEvent(@RequestBody Map<String, Object> logPayload) {
        String level = String.valueOf(logPayload.getOrDefault("level", "INFO")).toUpperCase();
        String message = String.valueOf(logPayload.getOrDefault("message", ""));
        String details = String.valueOf(logPayload.getOrDefault("details", ""));
        
        String logLine = String.format("%s [%s] - %s %s\n", 
                Instant.now().toString(), 
                level, 
                message, 
                details.isEmpty() ? "" : "- Details: " + details
        );

        if ("ERROR".equals(level)) {
            logger.error("[FRONTEND] {}", message);
        } else if ("WARN".equals(level)) {
            logger.warn("[FRONTEND] {}", message);
        } else {
            logger.info("[FRONTEND] {}", message);
        }

        try {
            Files.createDirectories(FRONTEND_LOG_PATH.getParent());
            Files.writeString(FRONTEND_LOG_PATH, logLine, 
                    StandardOpenOption.CREATE, 
                    StandardOpenOption.APPEND
            );
        } catch (IOException e) {
            logger.error("Failed to write frontend log to file", e);
        }

        return ResponseEntity.ok(ApiResponse.success("Log logged successfully", null));
    }
}

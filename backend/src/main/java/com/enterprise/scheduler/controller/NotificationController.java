package com.enterprise.scheduler.controller;

import com.enterprise.scheduler.dto.NotificationResponse;
import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.UserRepository;
import com.enterprise.scheduler.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        User user = getAuthenticatedUser();
        List<NotificationResponse> list = notificationService.getUserNotifications(user);
        return ResponseEntity.ok(list);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        notificationService.markAsRead(id, user);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Notification marked as read.");
        return ResponseEntity.ok(response);
    }
}

package com.enterprise.scheduler.notification;

import com.enterprise.scheduler.notification.NotificationResponse;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.notification.NotificationService;
import com.enterprise.scheduler.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications() {
        User user = getAuthenticatedUser();
        List<NotificationResponse> list = notificationService.getUserNotifications(user);
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved successfully", list));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }
}

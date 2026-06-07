package com.enterprise.scheduler.service;

import com.enterprise.scheduler.dto.NotificationResponse;
import com.enterprise.scheduler.entity.User;
import java.util.List;

public interface NotificationService {
    void createNotification(User user, String message);
    List<NotificationResponse> getUserNotifications(User user);
    void markAsRead(Long notificationId, User user);
    void sendVerificationEmail(User user, String token);
    void sendPasswordResetEmail(User user, String token);
}

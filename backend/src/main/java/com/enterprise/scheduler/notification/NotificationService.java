package com.enterprise.scheduler.notification;

import com.enterprise.scheduler.notification.NotificationResponse;
import com.enterprise.scheduler.user.User;
import java.util.List;

public interface NotificationService {
    void createNotification(User user, String message);
    void createNotification(User user, String message, Long messageId);
    List<NotificationResponse> getUserNotifications(User user);
    void markAsRead(Long notificationId, User user);
    void markAsUnread(Long notificationId, User user);
    void deleteNotification(Long notificationId, User user);
    void deleteMessageNotifications(Long messageId);
    void sendVerificationEmail(User user, String token);
    void sendPasswordResetEmail(User user, String token);
}

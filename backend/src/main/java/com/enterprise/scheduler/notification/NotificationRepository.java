package com.enterprise.scheduler.notification;

import com.enterprise.scheduler.notification.Notification;
import com.enterprise.scheduler.notification.NotificationStatus;
import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndStatus(User user, NotificationStatus status);
    List<Notification> findByMessageId(Long messageId);
}

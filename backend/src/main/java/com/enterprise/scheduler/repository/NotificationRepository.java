package com.enterprise.scheduler.repository;

import com.enterprise.scheduler.entity.Notification;
import com.enterprise.scheduler.entity.NotificationStatus;
import com.enterprise.scheduler.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndStatus(User user, NotificationStatus status);
}

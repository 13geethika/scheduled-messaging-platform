package com.enterprise.scheduler.repository;

import com.enterprise.scheduler.entity.Message;
import com.enterprise.scheduler.entity.MessageStatus;
import com.enterprise.scheduler.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderAndScheduledTimeIsNotNullOrderByScheduledTimeDesc(User sender);
    List<Message> findBySenderAndStatusOrderByScheduledTimeDesc(User sender, MessageStatus status);
    List<Message> findByStatus(MessageStatus status);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :sender")
    long countAllBySender(@Param("sender") User sender);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :sender AND m.status = :status")
    long countBySenderAndStatus(@Param("sender") User sender, @Param("status") MessageStatus status);

    @Query("SELECT m FROM Message m WHERE m.sender = :sender AND m.scheduledTime >= :now ORDER BY m.scheduledTime ASC")
    List<Message> findUpcomingScheduled(@Param("sender") User sender, @Param("now") Instant now);

    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :currentUser AND m.receiver = :contact) OR " +
           "(m.sender = :contact AND m.receiver = :currentUser AND m.status = com.enterprise.scheduler.entity.MessageStatus.DELIVERED) " +
           "ORDER BY m.createdAt ASC")
    List<Message> findChatHistory(@Param("currentUser") User currentUser, @Param("contact") User contact);
}

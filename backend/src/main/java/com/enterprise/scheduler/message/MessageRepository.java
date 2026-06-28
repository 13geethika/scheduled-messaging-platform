package com.enterprise.scheduler.message;

import com.enterprise.scheduler.message.Message;
import com.enterprise.scheduler.message.MessageStatus;
import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderAndScheduledTimeIsNotNullAndDeletedBySenderFalseOrderByScheduledTimeDesc(User sender);
    List<Message> findBySenderAndStatusOrderByScheduledTimeDesc(User sender, MessageStatus status);
    List<Message> findByStatus(MessageStatus status);

    @Query("SELECT COUNT(m) FROM Message m WHERE " +
           "(m.sender = :senderUser) OR " +
           "(m.receiver = :receiverUser AND m.status = com.enterprise.scheduler.message.MessageStatus.DELIVERED)")
    long countAllInAndOut(@Param("senderUser") User senderUser, @Param("receiverUser") User receiverUser);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.status = com.enterprise.scheduler.message.MessageStatus.DELIVERED AND " +
           "(m.sender = :senderUser OR m.receiver = :receiverUser)")
    long countDeliveredInAndOut(@Param("senderUser") User senderUser, @Param("receiverUser") User receiverUser);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :user AND m.status = com.enterprise.scheduler.message.MessageStatus.FAILED")
    long countFailedBySender(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :user AND m.status = com.enterprise.scheduler.message.MessageStatus.SCHEDULED")
    long countPendingBySender(@Param("user") User user);

    @Query("SELECT m FROM Message m WHERE m.sender = :sender AND m.scheduledTime >= :now AND m.deletedBySender = false ORDER BY m.scheduledTime ASC")
    List<Message> findUpcomingScheduled(@Param("sender") User sender, @Param("now") Instant now);

    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :senderUser AND m.receiver = :receiverContact AND m.deletedBySender = false) OR " +
           "(m.sender = :senderContact AND m.receiver = :receiverUser AND m.status = com.enterprise.scheduler.message.MessageStatus.DELIVERED AND m.deletedByReceiver = false) " +
           "ORDER BY COALESCE(m.sentTime, m.scheduledTime, m.createdAt) ASC")
    List<Message> findChatHistory(@Param("senderUser") User senderUser,
                                  @Param("receiverContact") User receiverContact,
                                  @Param("senderContact") User senderContact,
                                  @Param("receiverUser") User receiverUser);
}

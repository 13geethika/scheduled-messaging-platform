package com.enterprise.scheduler.message;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.Contact;
import com.enterprise.scheduler.user.ContactStatus;

import com.enterprise.scheduler.message.MessageScheduleRequest;
import com.enterprise.scheduler.message.MessageResponse;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.ContactRepository;
import com.enterprise.scheduler.message.MessageRepository;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.media.FileStorageService;
import com.enterprise.scheduler.message.MessageService;
import com.enterprise.scheduler.config.ChatWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.enterprise.scheduler.notification.NotificationService;
import com.enterprise.scheduler.scheduler.QuartzSchedulerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MessageServiceImpl implements MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageServiceImpl.class);

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ContactRepository contactRepository;
    private final FileStorageService fileStorageService;
    private final QuartzSchedulerService quartzSchedulerService;
    private final NotificationService notificationService;
    private final DeadLetterMessageRepository deadLetterMessageRepository;
    private final ChatWebSocketHandler chatWebSocketHandler;
    private final ObjectMapper objectMapper;

    public MessageServiceImpl(MessageRepository messageRepository,
                              UserRepository userRepository,
                              ContactRepository contactRepository,
                              FileStorageService fileStorageService,
                              QuartzSchedulerService quartzSchedulerService,
                              NotificationService notificationService,
                              DeadLetterMessageRepository deadLetterMessageRepository,
                              ChatWebSocketHandler chatWebSocketHandler,
                              ObjectMapper objectMapper) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.contactRepository = contactRepository;
        this.fileStorageService = fileStorageService;
        this.quartzSchedulerService = quartzSchedulerService;
        this.notificationService = notificationService;
        this.deadLetterMessageRepository = deadLetterMessageRepository;
        this.chatWebSocketHandler = chatWebSocketHandler;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public MessageResponse scheduleMessage(User user, MessageScheduleRequest request, MultipartFile file) {
        User receiver = userRepository.findByEmail(request.getReceiverEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found with email: " + request.getReceiverEmail()));

        // Verify that the receiver is in the sender's contact list and accepted
        Optional<Contact> contactRelation = contactRepository.findByUserAndContactUser(user, receiver);
        if (contactRelation.isEmpty() || contactRelation.get().getStatus() != ContactStatus.ACCEPTED) {
            throw new IllegalArgumentException("You can only schedule messages to contacts in your ACCEPTED contact list.");
        }

        String fileUrl = null;
        MessageType type = MessageType.valueOf(request.getMessageType().toUpperCase());
        
        if (type != MessageType.TEXT) {
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("File attachment is required for media message types: " + type);
            }
            fileUrl = fileStorageService.storeFile(file);
        } else {
            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                throw new IllegalArgumentException("Message content cannot be empty for text messages");
            }
        }

        Instant scheduledTime = request.getScheduledTime();
        boolean isImmediate = (scheduledTime == null);

        if (!isImmediate && scheduledTime.isBefore(Instant.now())) {
            throw new IllegalArgumentException("Scheduled time must be in the future");
        }

        Message message = Message.builder()
                .sender(user)
                .receiver(receiver)
                .content(request.getContent())
                .messageType(type)
                .fileUrl(fileUrl)
                .status(isImmediate ? MessageStatus.DELIVERED : MessageStatus.SCHEDULED)
                .scheduledTime(isImmediate ? null : scheduledTime)
                .sentTime(isImmediate ? Instant.now() : null)
                .recurringType(RecurringType.valueOf(request.getRecurringType().toUpperCase()))
                .retryCount(0)
                .maxRetries(3)
                .build();

        Message savedMessage = messageRepository.save(message);

        if (isImmediate) {
            notificationService.createNotification(receiver, 
                    "New message received from " + user.getName() + ": " + 
                    (type == MessageType.TEXT ? message.getContent() : "[" + type + " Attachment]"));
        } else {
            // Schedule in Quartz
            quartzSchedulerService.scheduleMessageJob(savedMessage);
        }

        broadcastMessageUpdate(savedMessage, "MESSAGE_UPDATE");
        return mapToMessageResponse(savedMessage);
    }

    @Override
    @Transactional
    public MessageResponse editMessage(User user, Long messageId, MessageScheduleRequest request, MultipartFile file) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to edit this message");
        }

        if (message.getStatus() == MessageStatus.DELIVERED) {
            throw new IllegalArgumentException("Delivered messages cannot be edited");
        }

        User receiver = userRepository.findByEmail(request.getReceiverEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        Optional<Contact> contactRelation = contactRepository.findByUserAndContactUser(user, receiver);
        if (contactRelation.isEmpty() || contactRelation.get().getStatus() != ContactStatus.ACCEPTED) {
            throw new IllegalArgumentException("Selected receiver is not an accepted contact.");
        }

        MessageType type = MessageType.valueOf(request.getMessageType().toUpperCase());
        message.setReceiver(receiver);
        message.setContent(request.getContent());
        message.setMessageType(type);
        message.setScheduledTime(request.getScheduledTime());
        message.setRecurringType(RecurringType.valueOf(request.getRecurringType().toUpperCase()));

        if (file != null && !file.isEmpty()) {
            String fileUrl = fileStorageService.storeFile(file);
            message.setFileUrl(fileUrl);
        }

        message.setStatus(MessageStatus.SCHEDULED); // Reset status
        message.setRetryCount(0);
        message.setErrorMessage(null);

        Message updatedMessage = messageRepository.save(message);

        // Update in Quartz
        quartzSchedulerService.rescheduleMessageJob(updatedMessage);

        broadcastMessageUpdate(updatedMessage, "MESSAGE_UPDATE");
        return mapToMessageResponse(updatedMessage);
    }
    @Override
    @Transactional
    public void deleteMessage(User user, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to delete this message");
        }

        // Delete from Quartz
        quartzSchedulerService.deleteMessageJob(messageId);

        // Delete from DB
        String senderEmail = message.getSender().getEmail();
        String receiverEmail = message.getReceiver().getEmail();
        messageRepository.delete(message);
        
        broadcastMessageDelete(messageId, senderEmail, receiverEmail);
    }

    @Override
    @Transactional
    public void deleteMessageForMe(User user, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        boolean isSender = message.getSender().getId().equals(user.getId());
        boolean isReceiver = message.getReceiver().getId().equals(user.getId());

        if (!isSender && !isReceiver) {
            throw new IllegalArgumentException("Unauthorized to delete this message");
        }

        if (isSender) {
            message.setDeletedBySender(true);
        }
        if (isReceiver) {
            message.setDeletedByReceiver(true);
        }

        // If both have deleted, clean it up completely
        if (message.isDeletedBySender() && message.isDeletedByReceiver()) {
            if (message.getStatus() == MessageStatus.SCHEDULED || message.getStatus() == MessageStatus.PENDING) {
                quartzSchedulerService.deleteMessageJob(messageId);
            }
            messageRepository.delete(message);
        } else {
            messageRepository.save(message);
            // If sender deletes a scheduled message, cancel Quartz delivery
            if (isSender && (message.getStatus() == MessageStatus.SCHEDULED || message.getStatus() == MessageStatus.PENDING)) {
                quartzSchedulerService.deleteMessageJob(messageId);
            }
        }
        
        broadcastMessageDelete(messageId, user.getEmail(), null);
    }

    @Override
    @Transactional
    public void pauseMessage(User user, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to pause this message");
        }

        if (message.getStatus() != MessageStatus.SCHEDULED) {
            throw new IllegalArgumentException("Only messages with SCHEDULED status can be paused");
        }

        message.setStatus(MessageStatus.PENDING); // Mark as PENDING (paused)
        Message saved = messageRepository.save(message);

        // Pause Quartz Trigger
        quartzSchedulerService.pauseMessageJob(messageId);
        
        broadcastMessageUpdate(saved, "MESSAGE_UPDATE");
    }

    @Override
    @Transactional
    public void resumeMessage(User user, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to resume this message");
        }

        if (message.getStatus() != MessageStatus.PENDING) {
            throw new IllegalArgumentException("Only messages with PENDING status can be resumed");
        }

        if (message.getScheduledTime().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Cannot resume message. The scheduled time has already passed. Please edit the scheduled time first.");
        }

        message.setStatus(MessageStatus.SCHEDULED);
        Message saved = messageRepository.save(message);

        // Resume Quartz Trigger
        quartzSchedulerService.resumeMessageJob(messageId);
        
        broadcastMessageUpdate(saved, "MESSAGE_UPDATE");
    }

    @Override
    public List<MessageResponse> getMyMessages(User user) {
        return messageRepository.findBySenderAndScheduledTimeIsNotNullAndDeletedBySenderFalseOrderByScheduledTimeDesc(user).stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageResponse> getChatHistory(User user, String contactEmail) {
        User contact = userRepository.findByEmail(contactEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with email: " + contactEmail));

        return messageRepository.findChatHistory(user, contact, contact, user).stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void retryFailedMessage(User user, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to retry this message");
        }

        if (message.getStatus() != MessageStatus.FAILED) {
            throw new IllegalArgumentException("Only messages with FAILED status can be retried");
        }

        message.setStatus(MessageStatus.SCHEDULED);
        message.setRetryCount(0);
        message.setErrorMessage(null);
        message.setScheduledTime(Instant.now().plus(java.time.Duration.ofMinutes(2))); // Schedule 2 minutes out for retry

        messageRepository.save(message);

        // Reschedule Quartz
        quartzSchedulerService.rescheduleMessageJob(message);
    }

    @Override
    @Transactional
    public void deliverMessage(Long messageId) {
        Message message = messageRepository.findById(messageId).orElse(null);
        if (message == null) {
            logger.warn("Quartz triggered for message ID: {} but it wasn't found in DB.", messageId);
            return;
        }

        if (message.getStatus() != MessageStatus.SCHEDULED) {
            logger.info("Message ID: {} status is {}, skipping delivery", messageId, message.getStatus());
            return;
        }

        try {
            logger.info("Delivering message ID: {} of type {} to receiver: {}", 
                    messageId, message.getMessageType(), message.getReceiver().getEmail());

            // Simulate Transmission (Integrate SMS API, Twilio, WhatsApp, Mail or push alert)
            // We verify by printing details and creating a real user-to-user in-app message notification
            String mediaInfo = (message.getFileUrl() != null) ? " (Attachment: " + message.getFileUrl() + ")" : "";
            logger.info(">>> SENT MSG FROM {} TO {}: {} {}", 
                    message.getSender().getEmail(), message.getReceiver().getEmail(), message.getContent(), mediaInfo);

            // Mark current message as DELIVERED
            message.setStatus(MessageStatus.DELIVERED);
            message.setSentTime(Instant.now());
            Message saved = messageRepository.save(message);
            broadcastMessageUpdate(saved, "MESSAGE_UPDATE");

            // Notify Receiver
            notificationService.createNotification(message.getReceiver(), 
                    "New message received from " + message.getSender().getName() + ": " + 
                    (message.getMessageType() == MessageType.TEXT ? message.getContent() : "[" + message.getMessageType() + " Attachment]"));

            // Handle Recurring schedules
            if (message.getRecurringType() != RecurringType.NONE) {
                scheduleNextRecurrence(message);
            }

        } catch (Exception e) {
            logger.error("Error occurred while delivering message ID: " + messageId, e);
            handleDeliveryFailure(message, e.getMessage());
        }
    }

    private void handleDeliveryFailure(Message message, String errorMsg) {
        int newRetryCount = message.getRetryCount() + 1;
        message.setRetryCount(newRetryCount);

        if (newRetryCount < message.getMaxRetries()) {
            message.setStatus(MessageStatus.SCHEDULED);
            // Retry 1 minute later
            message.setScheduledTime(Instant.now().plus(java.time.Duration.ofMinutes(1)));
            Message saved = messageRepository.save(message);
            
            logger.info("Scheduling retry number {} for message ID: {} in 1 minute", newRetryCount, message.getId());
            quartzSchedulerService.rescheduleMessageJob(message);
            broadcastMessageUpdate(saved, "MESSAGE_UPDATE");
        } else {
            message.setStatus(MessageStatus.FAILED);
            message.setErrorMessage(errorMsg);
            Message saved = messageRepository.save(message);

            logger.error("Message ID: {} failed completely after max retries.", message.getId());
            
            // Write to Dead Letter Queue (DLQ)
            DeadLetterMessage dlqMessage = DeadLetterMessage.builder()
                    .messageId(message.getId())
                    .senderEmail(message.getSender().getEmail())
                    .receiverEmail(message.getReceiver().getEmail())
                    .content(message.getContent())
                    .errorReason(errorMsg)
                    .failedAt(Instant.now())
                    .build();
            deadLetterMessageRepository.save(dlqMessage);

            // Notify Sender of failure
            notificationService.createNotification(message.getSender(), 
                    "Failed to deliver scheduled message to " + message.getReceiver().getName() + " after maximum retries.");
            broadcastMessageUpdate(saved, "MESSAGE_UPDATE");
        }
    }

    private void scheduleNextRecurrence(Message currentMessage) {
        java.time.ZonedDateTime zdt = currentMessage.getScheduledTime().atZone(java.time.ZoneOffset.UTC);
        java.time.ZonedDateTime nextZdt = switch (currentMessage.getRecurringType()) {
            case DAILY -> zdt.plusDays(1);
            case WEEKLY -> zdt.plusWeeks(1);
            case MONTHLY -> zdt.plusMonths(1);
            default -> zdt;
        };
        Instant nextScheduledTime = nextZdt.toInstant();

        Message nextMessage = Message.builder()
                .sender(currentMessage.getSender())
                .receiver(currentMessage.getReceiver())
                .content(currentMessage.getContent())
                .messageType(currentMessage.getMessageType())
                .fileUrl(currentMessage.getFileUrl())
                .status(MessageStatus.SCHEDULED)
                .scheduledTime(nextScheduledTime)
                .recurringType(currentMessage.getRecurringType())
                .retryCount(0)
                .maxRetries(currentMessage.getMaxRetries())
                .build();

        Message savedNextMessage = messageRepository.save(nextMessage);
        
        logger.info("Scheduled next recurrence for message ID: {} (Old ID: {}) on {}", 
                savedNextMessage.getId(), currentMessage.getId(), nextScheduledTime);
        
        quartzSchedulerService.scheduleMessageJob(savedNextMessage);
    }

    private MessageResponse mapToMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .senderEmail(message.getSender().getEmail())
                .receiverEmail(message.getReceiver().getEmail())
                .receiverName(message.getReceiver().getName())
                .content(message.getContent())
                .messageType(message.getMessageType().name())
                .fileUrl(message.getFileUrl())
                .status(message.getStatus().name())
                .scheduledTime(message.getScheduledTime())
                .sentTime(message.getSentTime())
                .recurringType(message.getRecurringType().name())
                .retryCount(message.getRetryCount())
                .errorMessage(message.getErrorMessage())
                .build();
    }

    private void broadcastMessageUpdate(Message message, String eventName) {
        try {
            MessageResponse response = mapToMessageResponse(message);
            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", eventName,
                "message", response
            );
            String json = objectMapper.writeValueAsString(payload);
            
            if (message.getSender() != null) {
                chatWebSocketHandler.sendNotification(message.getSender().getEmail(), json);
            }
            if (message.getReceiver() != null) {
                chatWebSocketHandler.sendNotification(message.getReceiver().getEmail(), json);
            }
        } catch (Exception e) {
            logger.error("Failed to broadcast WebSocket message update", e);
        }
    }

    private void broadcastMessageDelete(Long messageId, String senderEmail, String receiverEmail) {
        try {
            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", "MESSAGE_DELETE",
                "messageId", messageId
            );
            String json = objectMapper.writeValueAsString(payload);
            
            if (senderEmail != null) {
                chatWebSocketHandler.sendNotification(senderEmail, json);
            }
            if (receiverEmail != null) {
                chatWebSocketHandler.sendNotification(receiverEmail, json);
            }
        } catch (Exception e) {
            logger.error("Failed to broadcast WebSocket message delete", e);
        }
    }
}

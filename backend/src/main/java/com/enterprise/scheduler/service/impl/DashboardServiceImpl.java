package com.enterprise.scheduler.service.impl;

import com.enterprise.scheduler.dto.DashboardStatsResponse;
import com.enterprise.scheduler.dto.MessageResponse;
import com.enterprise.scheduler.entity.Message;
import com.enterprise.scheduler.entity.MessageStatus;
import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.repository.MessageRepository;
import com.enterprise.scheduler.service.DashboardService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final MessageRepository messageRepository;

    public DashboardServiceImpl(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @Override
    public DashboardStatsResponse getDashboardStats(User user) {
        long total = messageRepository.countAllBySender(user);
        long delivered = messageRepository.countBySenderAndStatus(user, MessageStatus.DELIVERED);
        long failed = messageRepository.countBySenderAndStatus(user, MessageStatus.FAILED);
        long pending = messageRepository.countBySenderAndStatus(user, MessageStatus.SCHEDULED);

        // Fetch upcoming 5 messages
        List<MessageResponse> upcoming = messageRepository.findUpcomingScheduled(user, Instant.now()).stream()
                .limit(5)
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .totalScheduled(total)
                .deliveredCount(delivered)
                .failedCount(failed)
                .pendingCount(pending)
                .upcomingMessages(upcoming)
                .build();
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
}

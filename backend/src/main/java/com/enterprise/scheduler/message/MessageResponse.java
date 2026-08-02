package com.enterprise.scheduler.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MessageResponse {
    private Long id;
    private String senderEmail;
    private String receiverEmail;
    private String receiverName;
    private String content;
    private String messageType;
    private String fileUrl;
    private String status;
    private Instant scheduledTime;
    private Instant sentTime;
    private String recurringType;
    private int retryCount;
    private String errorMessage;
    private boolean isRead;
    private Long replyToMessageId;
    private String replyToMessageContent;
    private String replyToMessageSenderName;
    private Long groupId;
    private String groupName;
}

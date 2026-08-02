package com.enterprise.scheduler.message;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;

@Data
public class MessageScheduleRequest {
    private String receiverEmail;

    private Long groupId;

    private String content;

    @NotBlank(message = "Message type is required")
    private String messageType; // TEXT, IMAGE, VIDEO, AUDIO

    private Instant scheduledTime;

    private String recurringType = "NONE"; // NONE, DAILY, WEEKLY, MONTHLY

    private Long replyToMessageId;
}

package com.enterprise.scheduler.message;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;

@Data
public class MessageScheduleRequest {
    @NotBlank(message = "Receiver email is required")
    @Email(message = "Invalid receiver email format")
    private String receiverEmail;

    private String content;

    @NotBlank(message = "Message type is required")
    private String messageType; // TEXT, IMAGE, VIDEO, AUDIO

    private Instant scheduledTime;

    private String recurringType = "NONE"; // NONE, DAILY, WEEKLY, MONTHLY

    private Long replyToMessageId;
}

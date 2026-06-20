package com.enterprise.scheduler.message;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "dead_letter_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeadLetterMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "sender_email", nullable = false)
    private String senderEmail;

    @Column(name = "receiver_email", nullable = false)
    private String receiverEmail;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "error_reason", columnDefinition = "TEXT")
    private String errorReason;

    @Column(name = "failed_at", nullable = false)
    @Builder.Default
    private Instant failedAt = Instant.now();
}

package com.enterprise.scheduler.service.impl;

import com.enterprise.scheduler.dto.NotificationResponse;
import com.enterprise.scheduler.entity.Notification;
import com.enterprise.scheduler.entity.NotificationStatus;
import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.NotificationRepository;
import com.enterprise.scheduler.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    public NotificationServiceImpl(NotificationRepository notificationRepository, JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    @Override
    @Transactional
    public void createNotification(User user, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .message(message)
                .status(NotificationStatus.UNREAD)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);
        logger.info("Created alert for user: {}", user.getEmail());
    }

    @Override
    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(n -> NotificationResponse.builder()
                        .id(n.getId())
                        .message(n.getMessage())
                        .status(n.getStatus().name())
                        .createdAt(n.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to notification");
        }

        notification.setStatus(NotificationStatus.READ);
        notificationRepository.save(notification);
    }

    @Override
    public void sendVerificationEmail(User user, String token) {
        String verificationUrl = "http://localhost:5173/verify-email?token=" + token;
        String subject = "Please Verify Your Email - Scheduled Messaging Platform";
        String content = "Hello " + user.getName() + ",\n\n" +
                "Thank you for registering. Please click the link below to verify your email address:\n" +
                verificationUrl + "\n\n" +
                "Regards,\nScheduled Messaging Platform Team";

        sendEmail(user.getEmail(), subject, content);
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        String resetUrl = "http://localhost:5173/reset-password?token=" + token;
        String subject = "Reset Password Request - Scheduled Messaging Platform";
        String content = "Hello " + user.getName() + ",\n\n" +
                "We received a request to reset your password. Please click the link below to set a new password:\n" +
                resetUrl + "\n\n" +
                "If you did not request this, you can ignore this email.\n\n" +
                "Regards,\nScheduled Messaging Platform Team";

        sendEmail(user.getEmail(), subject, content);
    }

    private void sendEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(to);
            mailMessage.setSubject(subject);
            mailMessage.setText(text);
            mailMessage.setFrom("no-reply@schedulerplatform.com");
            
            mailSender.send(mailMessage);
            logger.info("Verification/Reset email sent to {}", to);
        } catch (Exception e) {
            logger.error("Failed to send transactional email to {}: {}", to, e.getMessage());
            // Safe fallback so local executions don't crash when mail container isn't running
        }
    }
}

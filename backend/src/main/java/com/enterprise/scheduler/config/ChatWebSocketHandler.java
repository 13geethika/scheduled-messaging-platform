package com.enterprise.scheduler.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final org.springframework.context.ApplicationContext applicationContext;

    public ChatWebSocketHandler(org.springframework.context.ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    private com.enterprise.scheduler.user.UserRepository getUserRepository() {
        return applicationContext.getBean(com.enterprise.scheduler.user.UserRepository.class);
    }

    private com.enterprise.scheduler.user.ContactRepository getContactRepository() {
        return applicationContext.getBean(com.enterprise.scheduler.user.ContactRepository.class);
    }

    public boolean isUserOnline(String email) {
        WebSocketSession session = sessions.get(email);
        return session != null && session.isOpen();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String email = (String) session.getAttributes().get("userEmail");
        if (email != null) {
            sessions.put(email, session);
            logger.info("WebSocket connection established for user: {}", email);

            try {
                com.enterprise.scheduler.user.UserRepository userRepo = getUserRepository();
                userRepo.findByEmail(email).ifPresent(user -> {
                    user.setLastSeen(java.time.Instant.now());
                    userRepo.save(user);
                });
            } catch (Exception e) {
                logger.error("Failed to update last seen on connect", e);
            }

            broadcastStatusChange(email, "ONLINE");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String email = (String) session.getAttributes().get("userEmail");
        if (email != null) {
            sessions.remove(email);
            logger.info("WebSocket connection closed for user: {} with status: {}", email, status);

            try {
                com.enterprise.scheduler.user.UserRepository userRepo = getUserRepository();
                userRepo.findByEmail(email).ifPresent(user -> {
                    user.setLastSeen(java.time.Instant.now());
                    userRepo.save(user);
                });
            } catch (Exception e) {
                logger.error("Failed to update last seen on disconnect", e);
            }

            broadcastStatusChange(email, "AWAY");
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        String senderEmail = (String) session.getAttributes().get("userEmail");
        if (senderEmail == null) return;

        try {
            java.util.Map<String, Object> data = new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, java.util.Map.class);
            String event = (String) data.get("event");
            String receiverEmail = (String) data.get("receiverEmail");
            Object groupIdObj = data.get("groupId");

            if ("TYPING_START".equals(event) || "TYPING_STOP".equals(event)) {
                if (receiverEmail != null) {
                    java.util.Map<String, Object> forwardPayload = java.util.Map.of(
                            "event", event,
                            "senderEmail", senderEmail
                    );
                    String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(forwardPayload);
                    sendNotification(receiverEmail, json);
                } else if (groupIdObj != null) {
                    Long groupId = Long.valueOf(groupIdObj.toString());
                    com.enterprise.scheduler.group.ChatGroupRepository groupRepo = 
                        applicationContext.getBean(com.enterprise.scheduler.group.ChatGroupRepository.class);
                    groupRepo.findById(groupId).ifPresent(group -> {
                        java.util.Map<String, Object> forwardPayload = java.util.Map.of(
                                "event", event,
                                "senderEmail", senderEmail,
                                "groupId", groupId
                        );
                        try {
                            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(forwardPayload);
                            for (com.enterprise.scheduler.group.GroupMember member : group.getMembers()) {
                                if (member.getStatus() == com.enterprise.scheduler.group.MembershipStatus.ACCEPTED &&
                                        !member.getUser().getEmail().equals(senderEmail)) {
                                    sendNotification(member.getUser().getEmail(), json);
                                }
                            }
                        } catch (Exception ex) {
                            logger.error("Failed to serialize group typing event", ex);
                        }
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to handle incoming WebSocket message", e);
        }
    }

    public void sendNotification(String email, String jsonPayload) {
        WebSocketSession session = sessions.get(email);
        if (session != null && session.isOpen()) {
            try {
                synchronized (session) {
                    session.sendMessage(new TextMessage(jsonPayload));
                }
                logger.info("WebSocket notification sent to: {}", email);
            } catch (IOException e) {
                logger.error("Failed to send WebSocket notification to: {}", email, e);
            }
        }
    }

    private void broadcastStatusChange(String email, String status) {
        try {
            com.enterprise.scheduler.user.UserRepository userRepo = getUserRepository();
            com.enterprise.scheduler.user.User user = userRepo.findByEmail(email).orElse(null);
            if (user == null) return;

            com.enterprise.scheduler.user.ContactRepository contactRepo = getContactRepository();
            java.util.List<com.enterprise.scheduler.user.Contact> contacts = contactRepo.findByContactUserAndStatus(
                user, 
                com.enterprise.scheduler.user.ContactStatus.ACCEPTED
            );

            if (contacts == null || contacts.isEmpty()) return;

            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", "USER_STATUS_CHANGE",
                "email", email,
                "status", status,
                "lastSeen", java.time.Instant.now().toString()
            );
            String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);

            for (com.enterprise.scheduler.user.Contact c : contacts) {
                String peerEmail = c.getUser().getEmail();
                sendNotification(peerEmail, json);
            }
        } catch (Exception e) {
            logger.error("Failed to broadcast status change for {}", email, e);
        }
    }
}

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
    
    // Map of user email -> active WebSocketSession
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String email = (String) session.getAttributes().get("userEmail");
        if (email != null) {
            sessions.put(email, session);
            logger.info("WebSocket connection established for user: {}", email);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String email = (String) session.getAttributes().get("userEmail");
        if (email != null) {
            sessions.remove(email);
            logger.info("WebSocket connection closed for user: {} with status: {}", email, status);
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
}

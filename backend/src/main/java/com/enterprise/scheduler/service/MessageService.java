package com.enterprise.scheduler.service;

import com.enterprise.scheduler.dto.MessageScheduleRequest;
import com.enterprise.scheduler.dto.MessageResponse;
import com.enterprise.scheduler.entity.User;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface MessageService {
    MessageResponse scheduleMessage(User user, MessageScheduleRequest request, MultipartFile file);
    MessageResponse editMessage(User user, Long messageId, MessageScheduleRequest request, MultipartFile file);
    void deleteMessage(User user, Long messageId);
    void pauseMessage(User user, Long messageId);
    void resumeMessage(User user, Long messageId);
    List<MessageResponse> getMyMessages(User user);
    List<MessageResponse> getChatHistory(User user, String contactEmail);
    void retryFailedMessage(User user, Long messageId);
    void deliverMessage(Long messageId);
}

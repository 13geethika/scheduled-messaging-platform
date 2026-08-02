package com.enterprise.scheduler.message;

import com.enterprise.scheduler.message.MessageScheduleRequest;
import com.enterprise.scheduler.message.MessageResponse;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.message.MessageService;
import com.enterprise.scheduler.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final UserRepository userRepository;

    public MessageController(MessageService messageService, UserRepository userRepository) {
        this.messageService = messageService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @PostMapping(value = "/schedule", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<MessageResponse>> scheduleMessage(
            @Valid @ModelAttribute MessageScheduleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        User user = getAuthenticatedUser();
        MessageResponse response = messageService.scheduleMessage(user, request, file);
        return ResponseEntity.ok(ApiResponse.success("Message scheduled successfully", response));
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<MessageResponse>> editMessage(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute MessageScheduleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        User user = getAuthenticatedUser();
        MessageResponse response = messageService.editMessage(user, id, request, file);
        return ResponseEntity.ok(ApiResponse.success("Message updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.deleteMessage(user, id);
        return ResponseEntity.ok(ApiResponse.success("Scheduled message deleted successfully.", null));
    }

    @PostMapping("/{id}/delete-for-me")
    public ResponseEntity<ApiResponse<Void>> deleteMessageForMe(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.deleteMessageForMe(user, id);
        return ResponseEntity.ok(ApiResponse.success("Message deleted for you.", null));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<ApiResponse<Void>> pauseMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.pauseMessage(user, id);
        return ResponseEntity.ok(ApiResponse.success("Scheduled message paused successfully.", null));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<ApiResponse<Void>> resumeMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.resumeMessage(user, id);
        return ResponseEntity.ok(ApiResponse.success("Scheduled message resumed successfully.", null));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<Void>> retryMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.retryFailedMessage(user, id);
        return ResponseEntity.ok(ApiResponse.success("Retry job scheduled for failed message.", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getMyMessages() {
        User user = getAuthenticatedUser();
        List<MessageResponse> list = messageService.getMyMessages(user);
        return ResponseEntity.ok(ApiResponse.success("Scheduled messages retrieved successfully", list));
    }

    @GetMapping("/chat")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getChatHistory(@RequestParam("email") String email) {
        User user = getAuthenticatedUser();
        List<MessageResponse> list = messageService.getChatHistory(user, email);
        return ResponseEntity.ok(ApiResponse.success("Chat history retrieved successfully", list));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getGroupChatHistory(@PathVariable("groupId") Long groupId) {
        User user = getAuthenticatedUser();
        List<MessageResponse> list = messageService.getGroupChatHistory(user, groupId);
        return ResponseEntity.ok(ApiResponse.success("Group chat history retrieved successfully", list));
    }

    @PostMapping("/chat/read")
    public ResponseEntity<ApiResponse<Void>> markChatAsRead(@RequestParam("email") String email) {
        User user = getAuthenticatedUser();
        messageService.markChatAsRead(user, email);
        return ResponseEntity.ok(ApiResponse.success("Chat marked as read successfully", null));
    }
}

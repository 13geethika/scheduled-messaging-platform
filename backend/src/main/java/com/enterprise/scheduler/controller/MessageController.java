package com.enterprise.scheduler.controller;

import com.enterprise.scheduler.dto.MessageScheduleRequest;
import com.enterprise.scheduler.dto.MessageResponse;
import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.UserRepository;
import com.enterprise.scheduler.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    public ResponseEntity<MessageResponse> scheduleMessage(
            @Valid @ModelAttribute MessageScheduleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        User user = getAuthenticatedUser();
        MessageResponse response = messageService.scheduleMessage(user, request, file);
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute MessageScheduleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        User user = getAuthenticatedUser();
        MessageResponse response = messageService.editMessage(user, id, request, file);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.deleteMessage(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled message deleted successfully.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<Map<String, String>> pauseMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.pauseMessage(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled message paused successfully.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<Map<String, String>> resumeMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.resumeMessage(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Scheduled message resumed successfully.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<Map<String, String>> retryMessage(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        messageService.retryFailedMessage(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Retry job scheduled for failed message.");
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getMyMessages() {
        User user = getAuthenticatedUser();
        List<MessageResponse> list = messageService.getMyMessages(user);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/chat")
    public ResponseEntity<List<MessageResponse>> getChatHistory(@RequestParam("email") String email) {
        User user = getAuthenticatedUser();
        List<MessageResponse> list = messageService.getChatHistory(user, email);
        return ResponseEntity.ok(list);
    }
}

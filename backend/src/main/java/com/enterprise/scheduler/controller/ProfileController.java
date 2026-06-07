package com.enterprise.scheduler.controller;

import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getProfile() {
        User user = getAuthenticatedUser();
        
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("status", user.getStatus().name());
        profile.put("createdAt", user.getCreatedAt());
        
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, String> request) {
        User user = getAuthenticatedUser();
        String newName = request.get("name");
        
        if (newName == null || newName.trim().length() < 2) {
            throw new IllegalArgumentException("Name must be at least 2 characters");
        }

        user.setName(newName.trim());
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile updated successfully");
        response.put("name", user.getName());
        
        return ResponseEntity.ok(response);
    }
}

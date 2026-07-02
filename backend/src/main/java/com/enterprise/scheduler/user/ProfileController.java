package com.enterprise.scheduler.user;

import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.common.ApiResponse;
import com.enterprise.scheduler.media.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public ProfileController(UserRepository userRepository, FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile() {
        User user = getAuthenticatedUser();
        
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("status", user.getStatus().name());
        profile.put("createdAt", user.getCreatedAt());
        profile.put("profilePhotoUrl", user.getProfilePhotoUrl());
        
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(@RequestBody Map<String, String> request) {
        User user = getAuthenticatedUser();
        String newName = request.get("name");
        
        if (newName == null || newName.trim().length() < 2) {
            throw new IllegalArgumentException("Name must be at least 2 characters");
        }

        user.setName(newName.trim());
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("name", user.getName());
        
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", response));
    }

    @PostMapping(value = "/photo", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadProfilePhoto(@RequestParam("file") MultipartFile file) {
        User user = getAuthenticatedUser();
        
        if (user.getProfilePhotoUrl() != null) {
            try {
                fileStorageService.deleteFile(user.getProfilePhotoUrl());
            } catch (Exception e) {
                // Ignore if not deletable
            }
        }

        String photoUrl = fileStorageService.storeFile(file);
        user.setProfilePhotoUrl(photoUrl);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("profilePhotoUrl", photoUrl);

        return ResponseEntity.ok(ApiResponse.success("Profile photo uploaded successfully", response));
    }
}

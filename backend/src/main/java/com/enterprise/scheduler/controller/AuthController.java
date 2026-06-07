package com.enterprise.scheduler.controller;

import com.enterprise.scheduler.dto.*;
import com.enterprise.scheduler.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerUser(@Valid @RequestBody RegisterRequest request) {
        authService.registerUser(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Registration successful. Please check your email to verify your account.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest request) {
        JwtResponse jwtResponse = authService.authenticateUser(request);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam("token") String token) {
        authService.verifyEmail(token);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Email verified successfully. You can now login.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset link has been sent to your email.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password has been reset successfully. You can now login with your new password.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logoutUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        authService.logoutUser(email);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logout successful.");
        return ResponseEntity.ok(response);
    }
}

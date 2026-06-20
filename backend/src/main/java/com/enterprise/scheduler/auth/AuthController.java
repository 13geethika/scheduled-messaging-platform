package com.enterprise.scheduler.auth;

import com.enterprise.scheduler.auth.AuthService;
import com.enterprise.scheduler.auth.ForgotPasswordRequest;
import com.enterprise.scheduler.auth.LoginRequest;
import com.enterprise.scheduler.auth.RegisterRequest;
import com.enterprise.scheduler.auth.ResetPasswordRequest;
import com.enterprise.scheduler.auth.TokenRefreshRequest;
import com.enterprise.scheduler.auth.TokenRefreshResponse;
import com.enterprise.scheduler.auth.JwtResponse;
import com.enterprise.scheduler.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> registerUser(@Valid @RequestBody RegisterRequest request) {
        authService.registerUser(request);
        return ResponseEntity.ok(ApiResponse.success("Registration successful. Please check your email to verify your account.", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> authenticateUser(@Valid @RequestBody LoginRequest request) {
        JwtResponse jwtResponse = authService.authenticateUser(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", jwtResponse));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam("token") String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully. You can now login.", null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset link has been sent to your email.", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password has been reset successfully. You can now login with your new password.", null));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logoutUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        authService.logoutUser(email);
        return ResponseEntity.ok(ApiResponse.success("Logout successful.", null));
    }
}

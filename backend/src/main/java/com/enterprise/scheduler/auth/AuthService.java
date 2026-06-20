package com.enterprise.scheduler.auth;

public interface AuthService {
    void registerUser(RegisterRequest request);
    JwtResponse authenticateUser(LoginRequest request);
    TokenRefreshResponse refreshToken(TokenRefreshRequest request);
    void verifyEmail(String token);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    void logoutUser(String email);
}

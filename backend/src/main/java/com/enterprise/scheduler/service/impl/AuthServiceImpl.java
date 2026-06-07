package com.enterprise.scheduler.service.impl;

import com.enterprise.scheduler.config.JwtTokenProvider;
import com.enterprise.scheduler.dto.*;
import com.enterprise.scheduler.entity.*;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.RefreshTokenRepository;
import com.enterprise.scheduler.repository.UserRepository;
import com.enterprise.scheduler.service.AuthService;
import com.enterprise.scheduler.service.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;

    @Value("${app.jwt.refresh-expiration-ms:86400000}")
    private long refreshExpirationMs;

    public AuthServiceImpl(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider jwtTokenProvider,
                           NotificationService notificationService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public void registerUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_USER)
                .status(UserStatus.PENDING_VERIFICATION)
                .failedAttempts(0)
                .emailVerificationToken(verificationToken)
                .build();

        userRepository.save(user);

        // Send confirmation email
        notificationService.sendVerificationEmail(user, verificationToken);
    }

    @Override
    @Transactional
    public JwtResponse authenticateUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.getEmail()));

        // Check account lock
        if (user.getStatus() == UserStatus.LOCKED) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(LocalDateTime.now())) {
                user.setStatus(UserStatus.ACTIVE);
                user.setFailedAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
            } else {
                throw new IllegalArgumentException("Your account is locked. Please try again later.");
            }
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new IllegalArgumentException("Please verify your email address to activate your account.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int newFailedCount = user.getFailedAttempts() + 1;
            user.setFailedAttempts(newFailedCount);
            if (newFailedCount >= 5) {
                user.setStatus(UserStatus.LOCKED);
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                userRepository.save(user);
                throw new IllegalArgumentException("Account locked due to 5 failed login attempts. Try again in 15 minutes.");
            } else {
                userRepository.save(user);
                throw new BadCredentialsException("Invalid password. Attempts left: " + (5 - newFailedCount));
            }
        }

        // Authentication Success: reset attempts
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Generate Tokens
        String jwtToken = jwtTokenProvider.generateToken(user.getEmail());
        RefreshToken refreshToken = createRefreshToken(user);

        return JwtResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken.getToken())
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenRepository.findByToken(requestRefreshToken)
                .map(this::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtTokenProvider.generateToken(user.getEmail());
                    return new TokenRefreshResponse(accessToken, requestRefreshToken,"Bearer");
                })
                .orElseThrow(() -> new IllegalArgumentException("Refresh token is not in database!"));
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid verification token"));

        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerificationToken(null);
        userRepository.save(user);

        // Create welcome notification
        notificationService.createNotification(user, "Welcome to Scheduled Messaging Platform! Your email is verified successfully.");
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.getEmail()));

        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        userRepository.save(user);

        notificationService.sendPasswordResetEmail(user, resetToken);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid password reset token"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        userRepository.save(user);

        notificationService.createNotification(user, "Your password has been changed successfully. If you did not do this, please contact support immediately.");
    }

    @Override
    @Transactional
    public void logoutUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        refreshTokenRepository.deleteByUser(user);
    }

    // Refresh Token helper methods
    private RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .orElseGet(() -> RefreshToken.builder().user(user).build());

        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshExpirationMs));

        return refreshTokenRepository.save(refreshToken);
    }

    private RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new IllegalArgumentException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }
}

package com.enterprise.scheduler.service;

import com.enterprise.scheduler.auth.*;
import com.enterprise.scheduler.user.*;
import com.enterprise.scheduler.security.JwtTokenProvider;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.notification.NotificationService;
import com.enterprise.scheduler.audit.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User user;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshExpirationMs", 86400000L);

        user = User.builder()
                .id(1L)
                .name("Test User")
                .email("test@example.com")
                .password("hashed_password")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .failedAttempts(0)
                .build();

        registerRequest = new RegisterRequest();
        registerRequest.setName("Test User");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("raw_password");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("raw_password");
    }

    @Test
    void registerUser_Success() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");

        authService.registerUser(registerRequest);

        verify(userRepository, times(1)).save(any(User.class));
        verify(auditLogService, times(1)).logEvent(eq("USER_REGISTER"), eq("test@example.com"), anyString());
        // verify(notificationService, times(1)).sendVerificationEmail(any(User.class), anyString());
    }

    @Test
    void registerUser_EmailAlreadyInUse_ThrowsException() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> {
            authService.registerUser(registerRequest);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void authenticateUser_Success() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("raw_password", "hashed_password")).thenReturn(true);
        when(jwtTokenProvider.generateToken(anyString())).thenReturn("mock_jwt_token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JwtResponse response = authService.authenticateUser(loginRequest);

        assertNotNull(response);
        assertEquals("mock_jwt_token", response.getToken());
        assertEquals("test@example.com", response.getEmail());
        verify(userRepository, times(1)).save(user);
        verify(auditLogService, times(1)).logEvent(eq("USER_LOGIN_SUCCESS"), eq("test@example.com"), anyString());
    }

    @Test
    void authenticateUser_UserNotFound_ThrowsException() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            authService.authenticateUser(loginRequest);
        });

        verify(auditLogService, times(1)).logEvent(eq("USER_LOGIN_FAILED"), eq("test@example.com"), anyString());
    }

    @Test
    void authenticateUser_AccountLocked() {
        user.setStatus(UserStatus.LOCKED);
        user.setLockedUntil(Instant.now().plus(java.time.Duration.ofMinutes(10)));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> {
            authService.authenticateUser(loginRequest);
        });

        verify(auditLogService, times(1)).logEvent(eq("USER_LOGIN_FAILED"), eq("test@example.com"), anyString());
    }

    @Test
    void authenticateUser_PendingVerification() {
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> {
            authService.authenticateUser(loginRequest);
        });

        verify(auditLogService, times(1)).logEvent(eq("USER_LOGIN_FAILED"), eq("test@example.com"), anyString());
    }

    @Test
    void authenticateUser_BadCredentials_IncrementsFailedAttempts() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("raw_password", "hashed_password")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> {
            authService.authenticateUser(loginRequest);
        });

        assertEquals(1, user.getFailedAttempts());
        verify(userRepository, times(1)).save(user);
        verify(auditLogService, times(1)).logEvent(eq("USER_LOGIN_FAILED"), eq("test@example.com"), anyString());
    }

    @Test
    void authenticateUser_BadCredentials_MaxAttemptsLocksAccount() {
        user.setFailedAttempts(4);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("raw_password", "hashed_password")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> {
            authService.authenticateUser(loginRequest);
        });

        assertEquals(UserStatus.LOCKED, user.getStatus());
        assertNotNull(user.getLockedUntil());
        verify(userRepository, times(1)).save(user);
        verify(auditLogService, times(1)).logEvent(eq("USER_ACCOUNT_LOCKED"), eq("test@example.com"), anyString());
    }

    @Test
    void refreshToken_Success() {
        RefreshToken token = RefreshToken.builder()
                .token("valid_refresh_token")
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .used(false)
                .familyId("family_1")
                .build();

        when(refreshTokenRepository.findByToken("valid_refresh_token")).thenReturn(Optional.of(token));
        when(jwtTokenProvider.generateToken("test@example.com")).thenReturn("new_access_token");

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("valid_refresh_token");

        TokenRefreshResponse response = authService.refreshToken(request);

        assertNotNull(response);
        assertEquals("new_access_token", response.getAccessToken());
        assertTrue(token.isUsed());
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void refreshToken_HijackDetected_InvalidatesFamily() {
        RefreshToken token = RefreshToken.builder()
                .token("reused_refresh_token")
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .used(true)
                .familyId("family_1")
                .build();

        when(refreshTokenRepository.findByToken("reused_refresh_token")).thenReturn(Optional.of(token));

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("reused_refresh_token");

        assertThrows(SecurityException.class, () -> {
            authService.refreshToken(request);
        });

        verify(refreshTokenRepository, times(1)).deleteByFamilyId("family_1");
        verify(auditLogService, times(1)).logEvent(eq("TOKEN_HIJACKING_DETECTED"), eq("test@example.com"), anyString());
    }

    @Test
    void verifyEmail_Success() {
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        user.setEmailVerificationToken("token_123");
        when(userRepository.findByEmailVerificationToken("token_123")).thenReturn(Optional.of(user));

        authService.verifyEmail("token_123");

        assertEquals(UserStatus.ACTIVE, user.getStatus());
        assertNull(user.getEmailVerificationToken());
        verify(userRepository, times(1)).save(user);
    }
}

package com.enterprise.scheduler.config;

import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.Role;
import com.enterprise.scheduler.user.UserStatus;
import com.enterprise.scheduler.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@test.com")) {
            User admin = User.builder()
                    .name("System Administrator")
                    .email("admin@test.com")
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ROLE_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .failedAttempts(0)
                    .createdAt(Instant.now())
                    .build();
            userRepository.save(admin);
            System.out.println(">>> Seeded default administrator user: admin@test.com / admin123");
        }

        userRepository.findByEmail("geethika@gmail.com").ifPresent(user -> {
            user.setPassword(passwordEncoder.encode("password123"));
            user.setStatus(UserStatus.ACTIVE); // Ensure active status
            userRepository.save(user);
            System.out.println(">>> Reset password for geethika@gmail.com to: password123");
        });
    }
}

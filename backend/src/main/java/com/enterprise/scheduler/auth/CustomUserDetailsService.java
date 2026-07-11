package com.enterprise.scheduler.auth;

import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.UserStatus;
import com.enterprise.scheduler.user.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        boolean enabled = user.getStatus() == UserStatus.ACTIVE;
        boolean accountNonLocked = user.getStatus() != UserStatus.LOCKED;

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                enabled,
                true, // accountNonExpired
                true, // credentialsNonExpired
                accountNonLocked,
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole().name()))
        );
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateLastSeen(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            java.time.Instant now = java.time.Instant.now();
            if (user.getLastSeen() == null || java.time.Duration.between(user.getLastSeen(), now).getSeconds() > 30) {
                user.setLastSeen(now);
                userRepository.save(user);
            }
        });
    }
}

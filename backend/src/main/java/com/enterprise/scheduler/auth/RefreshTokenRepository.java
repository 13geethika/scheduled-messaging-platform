package com.enterprise.scheduler.auth;

import com.enterprise.scheduler.auth.RefreshToken;
import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    List<RefreshToken> findByUser(User user);
    List<RefreshToken> findByFamilyId(String familyId);

    @Modifying
    void deleteByFamilyId(String familyId);

    @Modifying
    int deleteByUser(User user);
}

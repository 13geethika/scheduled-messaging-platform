package com.enterprise.scheduler.group;

import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
    
    @Query("SELECT g FROM ChatGroup g JOIN g.members m WHERE m.user = :user AND m.status = 'ACCEPTED' ORDER BY g.createdAt DESC")
    List<ChatGroup> findGroupsByUser(@Param("user") User user);

    @Query("SELECT g FROM ChatGroup g JOIN g.members m WHERE m.user = :user AND m.status = 'PENDING' ORDER BY g.createdAt DESC")
    List<ChatGroup> findPendingInvitationsByUser(@Param("user") User user);
}

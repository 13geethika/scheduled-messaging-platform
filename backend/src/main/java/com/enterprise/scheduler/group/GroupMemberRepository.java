package com.enterprise.scheduler.group;

import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMemberId> {
    Optional<GroupMember> findByGroupAndUser(ChatGroup group, User user);
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
}

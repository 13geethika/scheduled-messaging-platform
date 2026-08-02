package com.enterprise.scheduler.group;

import com.enterprise.scheduler.user.User;
import java.util.List;

public interface ChatGroupService {
    ChatGroupResponse createGroup(User creator, ChatGroupRequest request);
    List<ChatGroupResponse> getMyGroups(User user);
    ChatGroupResponse getGroupDetails(User user, Long groupId);
    void acceptInvitation(User user, Long groupId);
    void leaveGroup(User user, Long groupId);
    void makeAdmin(User actor, Long groupId, Long targetUserId);
    ChatGroupResponse updateSettings(User actor, Long groupId, GroupSettingsRequest request);
    ChatGroupResponse updateGroupPhoto(User actor, Long groupId, org.springframework.web.multipart.MultipartFile file);
    List<ChatGroupResponse> getPendingInvitations(User user);
    void addMembers(User actor, Long groupId, List<String> memberEmails);
    void removeMember(User actor, Long groupId, Long targetUserId);
}

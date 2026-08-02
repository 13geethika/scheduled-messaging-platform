package com.enterprise.scheduler.group;

import com.enterprise.scheduler.common.ApiResponse;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class ChatGroupController {

    private final ChatGroupService chatGroupService;
    private final UserRepository userRepository;

    public ChatGroupController(ChatGroupService chatGroupService, UserRepository userRepository) {
        this.chatGroupService = chatGroupService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatGroupResponse>> createGroup(
            @Valid @RequestBody ChatGroupRequest request) {
        User user = getAuthenticatedUser();
        ChatGroupResponse response = chatGroupService.createGroup(user, request);
        return ResponseEntity.ok(ApiResponse.success("Group created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChatGroupResponse>>> getMyGroups() {
        User user = getAuthenticatedUser();
        List<ChatGroupResponse> list = chatGroupService.getMyGroups(user);
        return ResponseEntity.ok(ApiResponse.success("Groups retrieved successfully", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChatGroupResponse>> getGroupDetails(
            @PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        ChatGroupResponse response = chatGroupService.getGroupDetails(user, id);
        return ResponseEntity.ok(ApiResponse.success("Group details retrieved successfully", response));
    }

    @PostMapping("/{groupId}/accept")
    public ResponseEntity<ApiResponse<Void>> acceptInvitation(@PathVariable("groupId") Long groupId) {
        User user = getAuthenticatedUser();
        chatGroupService.acceptInvitation(user, groupId);
        return ResponseEntity.ok(ApiResponse.success("Group invitation accepted successfully", null));
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(@PathVariable("groupId") Long groupId) {
        User user = getAuthenticatedUser();
        chatGroupService.leaveGroup(user, groupId);
        return ResponseEntity.ok(ApiResponse.success("Left group successfully", null));
    }

    @PostMapping("/{groupId}/members/{userId}/make-admin")
    public ResponseEntity<ApiResponse<Void>> makeAdmin(
            @PathVariable("groupId") Long groupId,
            @PathVariable("userId") Long userId) {
        User user = getAuthenticatedUser();
        chatGroupService.makeAdmin(user, groupId, userId);
        return ResponseEntity.ok(ApiResponse.success("Member promoted to admin successfully", null));
    }

    @PutMapping("/{groupId}/settings")
    public ResponseEntity<ApiResponse<ChatGroupResponse>> updateSettings(
            @PathVariable("groupId") Long groupId,
            @Valid @RequestBody GroupSettingsRequest request) {
        User user = getAuthenticatedUser();
        ChatGroupResponse response = chatGroupService.updateSettings(user, groupId, request);
        return ResponseEntity.ok(ApiResponse.success("Group settings updated successfully", response));
    }

    @PostMapping("/{groupId}/photo")
    public ResponseEntity<ApiResponse<ChatGroupResponse>> updateGroupPhoto(
            @PathVariable("groupId") Long groupId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        User user = getAuthenticatedUser();
        ChatGroupResponse response = chatGroupService.updateGroupPhoto(user, groupId, file);
        return ResponseEntity.ok(ApiResponse.success("Group photo updated successfully", response));
    }

    @GetMapping("/invitations")
    public ResponseEntity<ApiResponse<List<ChatGroupResponse>>> getPendingInvitations() {
        User user = getAuthenticatedUser();
        List<ChatGroupResponse> list = chatGroupService.getPendingInvitations(user);
        return ResponseEntity.ok(ApiResponse.success("Pending group invitations retrieved successfully", list));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<Void>> addMembers(
            @PathVariable("groupId") Long groupId,
            @Valid @RequestBody AddGroupMembersRequest request) {
        User user = getAuthenticatedUser();
        chatGroupService.addMembers(user, groupId, request.getMemberEmails());
        return ResponseEntity.ok(ApiResponse.success("Members added successfully", null));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable("groupId") Long groupId,
            @PathVariable("userId") Long userId) {
        User user = getAuthenticatedUser();
        chatGroupService.removeMember(user, groupId, userId);
        return ResponseEntity.ok(ApiResponse.success("Member removed successfully", null));
    }
}

package com.enterprise.scheduler.group;

import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.media.FileStorageService;
import com.enterprise.scheduler.user.Contact;
import com.enterprise.scheduler.user.ContactRepository;
import com.enterprise.scheduler.user.ContactStatus;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.config.ChatWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatGroupServiceImpl implements ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;
    private final ContactRepository contactRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final FileStorageService fileStorageService;
    private final ChatWebSocketHandler chatWebSocketHandler;
    private final ObjectMapper objectMapper;

    public ChatGroupServiceImpl(ChatGroupRepository chatGroupRepository,
                               UserRepository userRepository,
                               ContactRepository contactRepository,
                               GroupMemberRepository groupMemberRepository,
                               FileStorageService fileStorageService,
                               ChatWebSocketHandler chatWebSocketHandler,
                               ObjectMapper objectMapper) {
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
        this.contactRepository = contactRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.fileStorageService = fileStorageService;
        this.chatWebSocketHandler = chatWebSocketHandler;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public ChatGroupResponse createGroup(User creator, ChatGroupRequest request) {
        if (request.getMemberEmails() == null || request.getMemberEmails().isEmpty()) {
            throw new IllegalArgumentException("Group must have at least one member.");
        }

        List<User> validatedMembers = new ArrayList<>();
        for (String email : request.getMemberEmails()) {
            if (email.equalsIgnoreCase(creator.getEmail())) {
                continue;
            }

            User memberUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("Member user not found with email: " + email));

            // Verify that the member is in the creator's accepted contact list
            Optional<Contact> contactOpt = contactRepository.findByUserAndContactUser(creator, memberUser);
            if (contactOpt.isEmpty() || contactOpt.get().getStatus() != ContactStatus.ACCEPTED) {
                throw new IllegalArgumentException("User " + email + " is not in your accepted contact list.");
            }

            validatedMembers.add(memberUser);
        }

        ChatGroup group = ChatGroup.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(creator)
                .build();

        ChatGroup savedGroup = chatGroupRepository.save(group);

        // Creator is automatically an ADMIN and ACCEPTED
        GroupMember creatorMember = GroupMember.builder()
                .group(savedGroup)
                .user(creator)
                .role(GroupRole.ADMIN)
                .status(MembershipStatus.ACCEPTED)
                .joinedAt(Instant.now())
                .build();
        groupMemberRepository.save(creatorMember);

        // Save invited members
        for (User memberUser : validatedMembers) {
            GroupMember invitedMember = GroupMember.builder()
                    .group(savedGroup)
                    .user(memberUser)
                    .role(GroupRole.MEMBER)
                    .status(MembershipStatus.PENDING)
                    .build();
            groupMemberRepository.save(invitedMember);
        }

        // Fetch refreshed entity with members loaded
        ChatGroup finalGroup = chatGroupRepository.findById(savedGroup.getId()).orElse(savedGroup);
        broadcastGroupUpdate(finalGroup);

        return mapToGroupResponse(finalGroup);
    }

    @Override
    public List<ChatGroupResponse> getMyGroups(User user) {
        return chatGroupRepository.findGroupsByUser(user).stream()
                .map(this::mapToGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ChatGroupResponse getGroupDetails(User user, Long groupId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember member = groupMemberRepository.findByGroupAndUser(group, user)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        return mapToGroupResponse(group);
    }

    @Override
    @Transactional
    public void acceptInvitation(User user, Long groupId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember member = groupMemberRepository.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResourceNotFoundException("Group invitation not found."));

        if (member.getStatus() == MembershipStatus.ACCEPTED) {
            return; // Already accepted
        }

        member.setStatus(MembershipStatus.ACCEPTED);
        member.setJoinedAt(Instant.now());
        groupMemberRepository.save(member);

        // Fetch refreshed group and broadcast
        ChatGroup updatedGroup = chatGroupRepository.findById(groupId).orElse(group);
        broadcastGroupUpdate(updatedGroup);
    }

    @Override
    @Transactional
    public void leaveGroup(User user, Long groupId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember member = groupMemberRepository.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found."));

        groupMemberRepository.delete(member);

        // Refresh list of remaining members
        List<GroupMember> remaining = groupMemberRepository.findAll().stream()
                .filter(m -> m.getGroup().getId().equals(groupId))
                .collect(Collectors.toList());

        // If no members are left (or all are pending invites), delete the group
        long acceptedCount = remaining.stream().filter(m -> m.getStatus() == MembershipStatus.ACCEPTED).count();
        if (acceptedCount == 0) {
            chatGroupRepository.delete(group);
            return;
        }

        // If the leaving user was an ADMIN, and there are no other ADMINs, promote the oldest member
        if (member.getRole() == GroupRole.ADMIN) {
            boolean hasOtherAdmin = remaining.stream()
                    .anyMatch(m -> m.getRole() == GroupRole.ADMIN && m.getStatus() == MembershipStatus.ACCEPTED);

            if (!hasOtherAdmin) {
                // Find oldest accepted member to promote
                Optional<GroupMember> oldestMember = remaining.stream()
                        .filter(m -> m.getStatus() == MembershipStatus.ACCEPTED)
                        .min(Comparator.comparing(m -> m.getJoinedAt() != null ? m.getJoinedAt() : Instant.MAX));

                oldestMember.ifPresent(m -> {
                    m.setRole(GroupRole.ADMIN);
                    groupMemberRepository.save(m);
                });
            }
        }

        // Broadcast to remaining members
        ChatGroup updatedGroup = chatGroupRepository.findById(groupId).orElse(group);
        broadcastGroupUpdate(updatedGroup);

        // Also notify the leaving user that the group update occurred (so their UI removes it)
        try {
            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", "GROUP_LEAVE",
                "groupId", groupId
            );
            String json = objectMapper.writeValueAsString(payload);
            chatWebSocketHandler.sendNotification(user.getEmail(), json);
        } catch (Exception ignored) {}
    }

    @Override
    @Transactional
    public void makeAdmin(User actor, Long groupId, Long targetUserId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember actorMember = groupMemberRepository.findByGroupAndUser(group, actor)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        if (actorMember.getRole() != GroupRole.ADMIN || actorMember.getStatus() != MembershipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only group admins can promote other members.");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        GroupMember targetMember = groupMemberRepository.findByGroupAndUser(group, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Target user is not a member of this group."));

        targetMember.setRole(GroupRole.ADMIN);
        groupMemberRepository.save(targetMember);

        // Broadcast updates
        broadcastGroupUpdate(group);
    }

    @Override
    @Transactional
    public ChatGroupResponse updateSettings(User actor, Long groupId, GroupSettingsRequest request) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember actorMember = groupMemberRepository.findByGroupAndUser(group, actor)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        if (actorMember.getRole() != GroupRole.ADMIN || actorMember.getStatus() != MembershipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only group admins can update settings.");
        }

        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setAdminsOnlyMessaging(request.isAdminsOnlyMessaging());

        ChatGroup savedGroup = chatGroupRepository.save(group);
        broadcastGroupUpdate(savedGroup);

        return mapToGroupResponse(savedGroup);
    }

    @Override
    @Transactional
    public ChatGroupResponse updateGroupPhoto(User actor, Long groupId, MultipartFile file) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember actorMember = groupMemberRepository.findByGroupAndUser(group, actor)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        if (actorMember.getRole() != GroupRole.ADMIN || actorMember.getStatus() != MembershipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only group admins can update group photo.");
        }

        String photoUrl = fileStorageService.storeFile(file);
        group.setGroupPhotoUrl(photoUrl);

        ChatGroup savedGroup = chatGroupRepository.save(group);
        broadcastGroupUpdate(savedGroup);

        return mapToGroupResponse(savedGroup);
    }

    @Override
    public List<ChatGroupResponse> getPendingInvitations(User user) {
        return chatGroupRepository.findPendingInvitationsByUser(user).stream()
                .map(this::mapToGroupResponse)
                .collect(Collectors.toList());
    }

    private void broadcastGroupUpdate(ChatGroup group) {
        try {
            ChatGroupResponse response = mapToGroupResponse(group);
            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", "GROUP_UPDATE",
                "group", response
            );
            String json = objectMapper.writeValueAsString(payload);
            for (GroupMember member : group.getMembers()) {
                chatWebSocketHandler.sendNotification(member.getUser().getEmail(), json);
            }
        } catch (Exception e) {
            // Log error
        }
    }

    private ChatGroupResponse mapToGroupResponse(ChatGroup group) {
        List<ChatGroupResponse.MemberInfo> members = group.getMembers().stream()
                .map(m -> ChatGroupResponse.MemberInfo.builder()
                        .id(m.getUser().getId())
                        .name(m.getUser().getName())
                        .email(m.getUser().getEmail())
                        .profilePhotoUrl(m.getUser().getProfilePhotoUrl())
                        .role(m.getRole().name())
                        .status(m.getStatus().name())
                        .build())
                .collect(Collectors.toList());

        return ChatGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdByEmail(group.getCreatedBy().getEmail())
                .createdByName(group.getCreatedBy().getName())
                .members(members)
                .adminsOnlyMessaging(group.isAdminsOnlyMessaging())
                .groupPhotoUrl(group.getGroupPhotoUrl())
                .createdAt(group.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public void addMembers(User actor, Long groupId, List<String> memberEmails) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember actorMember = groupMemberRepository.findByGroupAndUser(group, actor)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        if (actorMember.getRole() != GroupRole.ADMIN || actorMember.getStatus() != MembershipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only group admins can add members.");
        }

        for (String email : memberEmails) {
            User memberUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

            // Check if already in group
            Optional<GroupMember> existingMember = groupMemberRepository.findByGroupAndUser(group, memberUser);
            if (existingMember.isPresent()) {
                continue; // skip
            }

            // Verify contact status
            Optional<Contact> contactOpt = contactRepository.findByUserAndContactUser(actor, memberUser);
            if (contactOpt.isEmpty() || contactOpt.get().getStatus() != ContactStatus.ACCEPTED) {
                throw new IllegalArgumentException("User " + email + " is not in your accepted contact list.");
            }

            GroupMember invitedMember = GroupMember.builder()
                    .group(group)
                    .user(memberUser)
                    .role(GroupRole.MEMBER)
                    .status(MembershipStatus.PENDING)
                    .build();
            groupMemberRepository.save(invitedMember);
        }

        ChatGroup updatedGroup = chatGroupRepository.findById(groupId).orElse(group);
        broadcastGroupUpdate(updatedGroup);
    }

    @Override
    @Transactional
    public void removeMember(User actor, Long groupId, Long targetUserId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        GroupMember actorMember = groupMemberRepository.findByGroupAndUser(group, actor)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this group."));

        if (actorMember.getRole() != GroupRole.ADMIN || actorMember.getStatus() != MembershipStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only group admins can remove members.");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        if (targetUser.getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Admins cannot remove themselves, please use leave group instead.");
        }

        GroupMember targetMember = groupMemberRepository.findByGroupAndUser(group, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("Target user is not a member of this group."));

        groupMemberRepository.delete(targetMember);

        ChatGroup updatedGroup = chatGroupRepository.findById(groupId).orElse(group);
        broadcastGroupUpdate(updatedGroup);

        // Notify removed user
        try {
            java.util.Map<String, Object> payload = java.util.Map.of(
                "event", "GROUP_LEAVE",
                "groupId", groupId
            );
            String json = objectMapper.writeValueAsString(payload);
            chatWebSocketHandler.sendNotification(targetUser.getEmail(), json);
        } catch (Exception ignored) {}
    }
}

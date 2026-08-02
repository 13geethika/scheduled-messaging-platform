package com.enterprise.scheduler.service;

import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.group.*;
import com.enterprise.scheduler.user.*;
import com.enterprise.scheduler.media.FileStorageService;
import com.enterprise.scheduler.config.ChatWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChatGroupServiceTest {

    @Mock
    private ChatGroupRepository chatGroupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private ChatWebSocketHandler chatWebSocketHandler;

    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private ChatGroupServiceImpl chatGroupService;

    private User creator;
    private User friend;
    private User nonFriend;
    private ChatGroupRequest request;

    @BeforeEach
    void setUp() {
        creator = User.builder().id(1L).email("creator@test.com").name("Creator").build();
        friend = User.builder().id(2L).email("friend@test.com").name("Friend").build();
        nonFriend = User.builder().id(3L).email("nonfriend@test.com").name("Non Friend").build();

        request = new ChatGroupRequest();
        request.setName("Test Group");
        request.setDescription("A test description");
        request.setMemberEmails(Arrays.asList("friend@test.com"));
    }

    @Test
    void createGroup_Success() {
        Contact contact = Contact.builder().user(creator).contactUser(friend).status(ContactStatus.ACCEPTED).build();

        when(userRepository.findByEmail("friend@test.com")).thenReturn(Optional.of(friend));
        when(contactRepository.findByUserAndContactUser(creator, friend)).thenReturn(Optional.of(contact));

        ChatGroup expectedGroup = ChatGroup.builder()
                .id(1L)
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(creator)
                .build();
        
        expectedGroup.getMembers().add(GroupMember.builder()
                .group(expectedGroup)
                .user(creator)
                .role(GroupRole.ADMIN)
                .status(MembershipStatus.ACCEPTED)
                .build());
        expectedGroup.getMembers().add(GroupMember.builder()
                .group(expectedGroup)
                .user(friend)
                .role(GroupRole.MEMBER)
                .status(MembershipStatus.ACCEPTED)
                .build());

        when(chatGroupRepository.save(any(ChatGroup.class))).thenReturn(expectedGroup);
        when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(expectedGroup));

        ChatGroupResponse response = chatGroupService.createGroup(creator, request);

        assertNotNull(response);
        assertEquals("Test Group", response.getName());
        assertEquals("creator@test.com", response.getCreatedByEmail());
        assertEquals(2, response.getMembers().size());
        verify(chatGroupRepository, times(1)).save(any(ChatGroup.class));
    }

    @Test
    void createGroup_NotAcceptedContact_ThrowsException() {
        Contact contact = Contact.builder().user(creator).contactUser(nonFriend).status(ContactStatus.PENDING).build();
        request.setMemberEmails(Arrays.asList("nonfriend@test.com"));

        when(userRepository.findByEmail("nonfriend@test.com")).thenReturn(Optional.of(nonFriend));
        when(contactRepository.findByUserAndContactUser(creator, nonFriend)).thenReturn(Optional.of(contact));

        assertThrows(IllegalArgumentException.class, () -> {
            chatGroupService.createGroup(creator, request);
        });

        verify(chatGroupRepository, never()).save(any(ChatGroup.class));
    }

    @Test
    void getGroupDetails_NotMember_ThrowsException() {
        ChatGroup group = ChatGroup.builder()
                .id(1L)
                .name("Group Name")
                .createdBy(friend)
                .build();
        
        group.getMembers().add(GroupMember.builder()
                .group(group)
                .user(friend)
                .role(GroupRole.ADMIN)
                .status(MembershipStatus.ACCEPTED)
                .build());

        when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupAndUser(any(ChatGroup.class), any(User.class)))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            chatGroupService.getGroupDetails(creator, 1L);
        });
    }

    @Test
    void addMembers_Success() {
        ChatGroup group = ChatGroup.builder().id(1L).name("Test Group").createdBy(creator).build();
        GroupMember adminMember = GroupMember.builder().group(group).user(creator).role(GroupRole.ADMIN).status(MembershipStatus.ACCEPTED).build();
        group.getMembers().add(adminMember);

        when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupAndUser(group, creator)).thenReturn(Optional.of(adminMember));
        when(userRepository.findByEmail("friend@test.com")).thenReturn(Optional.of(friend));
        when(groupMemberRepository.findByGroupAndUser(group, friend)).thenReturn(Optional.empty());

        Contact contact = Contact.builder().user(creator).contactUser(friend).status(ContactStatus.ACCEPTED).build();
        when(contactRepository.findByUserAndContactUser(creator, friend)).thenReturn(Optional.of(contact));

        chatGroupService.addMembers(creator, 1L, Arrays.asList("friend@test.com"));

        verify(groupMemberRepository, times(1)).save(any(GroupMember.class));
    }

    @Test
    void removeMember_Success() {
        ChatGroup group = ChatGroup.builder().id(1L).name("Test Group").createdBy(creator).build();
        GroupMember adminMember = GroupMember.builder().group(group).user(creator).role(GroupRole.ADMIN).status(MembershipStatus.ACCEPTED).build();
        GroupMember memberToRemove = GroupMember.builder().group(group).user(friend).role(GroupRole.MEMBER).status(MembershipStatus.ACCEPTED).build();
        group.getMembers().add(adminMember);
        group.getMembers().add(memberToRemove);

        when(chatGroupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupAndUser(group, creator)).thenReturn(Optional.of(adminMember));
        when(userRepository.findById(2L)).thenReturn(Optional.of(friend));
        when(groupMemberRepository.findByGroupAndUser(group, friend)).thenReturn(Optional.of(memberToRemove));

        chatGroupService.removeMember(creator, 1L, 2L);

        verify(groupMemberRepository, times(1)).delete(memberToRemove);
    }
}

package com.enterprise.scheduler.service;

import com.enterprise.scheduler.message.MessageScheduleRequest;
import com.enterprise.scheduler.user.Contact;
import com.enterprise.scheduler.user.ContactStatus;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.user.ContactRepository;
import com.enterprise.scheduler.message.MessageRepository;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.message.MessageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MessageServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private MessageRepository messageRepository;

    @InjectMocks
    private MessageServiceImpl messageService;

    private User sender;
    private User receiver;
    private MessageScheduleRequest request;

    @BeforeEach
    void setUp() {
        sender = User.builder().id(1L).email("sender@test.com").name("Sender").build();
        receiver = User.builder().id(2L).email("receiver@test.com").name("Receiver").build();

        request = new MessageScheduleRequest();
        request.setReceiverEmail("receiver@test.com");
        request.setMessageType("TEXT");
        request.setContent("Hello World");
        request.setRecurringType("NONE");
    }

    @Test
    void scheduleMessage_PastTime_ThrowsException() {
        request.setScheduledTime(Instant.now().minus(java.time.Duration.ofHours(1)));

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(receiver));
        
        Contact contact = Contact.builder().user(sender).contactUser(receiver).status(ContactStatus.ACCEPTED).build();
        when(contactRepository.findByUserAndContactUser(sender, receiver)).thenReturn(Optional.of(contact));

        assertThrows(IllegalArgumentException.class, () -> {
            messageService.scheduleMessage(sender, request, null);
        });
    }
}

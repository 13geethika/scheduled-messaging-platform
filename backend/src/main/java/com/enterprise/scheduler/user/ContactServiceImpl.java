package com.enterprise.scheduler.user;
import com.enterprise.scheduler.notification.Notification;

import com.enterprise.scheduler.user.ContactResponse;
import com.enterprise.scheduler.user.Contact;
import com.enterprise.scheduler.user.ContactStatus;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.ContactRepository;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.user.ContactService;
import com.enterprise.scheduler.notification.NotificationService;
import com.enterprise.scheduler.message.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ContactServiceImpl implements ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MessageRepository messageRepository;
    private final com.enterprise.scheduler.config.ChatWebSocketHandler chatWebSocketHandler;

    public ContactServiceImpl(ContactRepository contactRepository, 
                              UserRepository userRepository,
                              NotificationService notificationService,
                              MessageRepository messageRepository,
                              com.enterprise.scheduler.config.ChatWebSocketHandler chatWebSocketHandler) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.messageRepository = messageRepository;
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    @Override
    @Transactional
    public void sendContactRequest(User user, String contactEmail) {
        if (user.getEmail().equalsIgnoreCase(contactEmail)) {
            throw new IllegalArgumentException("You cannot add yourself as a contact");
        }

        User contactUser = userRepository.findByEmail(contactEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No user found with email: " + contactEmail));

        // Check if there is already an existing contact relationship
        Optional<Contact> existingRequest = contactRepository.findByUserAndContactUser(user, contactUser);
        if (existingRequest.isPresent()) {
            throw new IllegalArgumentException("Relationship already exists with status: " + existingRequest.get().getStatus());
        }

        // Check the reverse request
        Optional<Contact> reverseRequest = contactRepository.findByUserAndContactUser(contactUser, user);
        if (reverseRequest.isPresent()) {
            if (reverseRequest.get().getStatus() == ContactStatus.PENDING) {
                throw new IllegalArgumentException("This user has already sent you a request. Please accept it.");
            } else {
                throw new IllegalArgumentException("Relationship already exists with status: " + reverseRequest.get().getStatus());
            }
        }

        // Save new request (status: PENDING)
        Contact contact = Contact.builder()
                .user(user)
                .contactUser(contactUser)
                .status(ContactStatus.PENDING)
                .build();
        contactRepository.save(contact);

        // Send Notification to recipient
        notificationService.createNotification(contactUser, user.getName() + " sent you a contact request.");
    }

    @Override
    public List<ContactResponse> getContacts(User user, String status) {
        ContactStatus contactStatus = ContactStatus.valueOf(status.toUpperCase());
        return contactRepository.findByUserAndStatus(user, contactStatus).stream()
                .map(c -> mapToContactResponse(c, user))
                .collect(Collectors.toList());
    }

    @Override
    public List<ContactResponse> getPendingRequests(User user) {
        // Pending requests received by this user (where this user is contactUser)
        return contactRepository.findByContactUserAndStatus(user, ContactStatus.PENDING).stream()
                .map(c -> ContactResponse.builder()
                        .id(c.getId())
                        .contactId(c.getUser().getId())
                        .name(c.getUser().getName())
                        .email(c.getUser().getEmail())
                        .status(c.getStatus().name())
                        .profilePhotoUrl(c.getUser().getProfilePhotoUrl())
                        .unreadCount(0)
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void acceptContactRequest(User user, Long contactRecordId) {
        Contact request = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact request not found"));

        if (!request.getContactUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to accept this request");
        }

        if (request.getStatus() != ContactStatus.PENDING) {
            throw new IllegalArgumentException("Request is not in PENDING state");
        }

        // 1. Update the original request status to ACCEPTED
        request.setStatus(ContactStatus.ACCEPTED);
        contactRepository.save(request);

        // 2. Create the reverse record so both users see each other in their contact lists
        User sender = request.getUser();
        Optional<Contact> reverse = contactRepository.findByUserAndContactUser(user, sender);
        if (reverse.isEmpty()) {
            Contact reverseContact = Contact.builder()
                    .user(user)
                    .contactUser(sender)
                    .status(ContactStatus.ACCEPTED)
                    .build();
            contactRepository.save(reverseContact);
        } else {
            Contact rev = reverse.get();
            rev.setStatus(ContactStatus.ACCEPTED);
            contactRepository.save(rev);
        }

        // Send notifications
        notificationService.createNotification(sender, user.getName() + " accepted your contact request.");
        notificationService.createNotification(user, "You are now connected with " + sender.getName());
    }

    @Override
    @Transactional
    public void rejectContactRequest(User user, Long contactRecordId) {
        Contact request = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact request not found"));

        if (!request.getContactUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to reject this request");
        }

        contactRepository.hardDeleteById(request.getId());
    }

    @Override
    @Transactional
    public void blockContact(User user, Long contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact record not found"));

        if (!contact.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to this contact");
        }

        contact.setStatus(ContactStatus.BLOCKED);
        contactRepository.save(contact);

        // Hard delete reverse record if it exists to avoid unique constraint violations on unblock
        contactRepository.hardDeleteByUserAndContactUser(contact.getContactUser().getId(), user.getId());
    }

    @Override
    @Transactional
    public void removeContact(User user, Long contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));

        if (!contact.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to this contact");
        }

        User associatedUser = contact.getContactUser();
        
        // Hard delete original record to clear space for potential future adds
        contactRepository.hardDeleteById(contact.getId());

        // Hard delete reverse record
        contactRepository.hardDeleteByUserAndContactUser(associatedUser.getId(), user.getId());
    }

    @Override
    public List<ContactResponse> searchContacts(User user, String query) {
        return contactRepository.searchContacts(user.getId(), ContactStatus.ACCEPTED, query).stream()
                .map(c -> mapToContactResponse(c, user))
                .collect(Collectors.toList());
    }

    private ContactResponse mapToContactResponse(Contact contact, User currentUser) {
        int unread = (int) messageRepository.countBySenderAndReceiverAndStatusAndIsReadFalseAndDeletedByReceiverFalse(
                contact.getContactUser(),
                currentUser,
                com.enterprise.scheduler.message.MessageStatus.DELIVERED
        );

        User contactUser = contact.getContactUser();
        String onlineStatus = "OFFLINE";
        if (chatWebSocketHandler.isUserOnline(contactUser.getEmail())) {
            onlineStatus = "ONLINE";
        } else if (contactUser.getLastSeen() != null && 
                   java.time.Duration.between(contactUser.getLastSeen(), java.time.Instant.now()).toHours() < 1) {
            onlineStatus = "AWAY";
        }

        return ContactResponse.builder()
                .id(contact.getId())
                .contactId(contactUser.getId())
                .name(contact.getCustomName() != null ? contact.getCustomName() : contactUser.getName())
                .email(contactUser.getEmail())
                .status(contact.getStatus().name())
                .profilePhotoUrl(contactUser.getProfilePhotoUrl())
                .unreadCount(unread)
                .unblockCount(contact.getUnblockCount())
                .onlineStatus(onlineStatus)
                .lastSeen(contactUser.getLastSeen())
                .customName(contact.getCustomName())
                .build();
    }

    @Override
    @Transactional
    public void unblockContact(User user, Long contactRecordId) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact record not found"));

        if (!contact.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to this contact");
        }

        if (contact.getStatus() != ContactStatus.BLOCKED) {
            throw new IllegalArgumentException("This contact is not blocked");
        }

        if (contact.getUnblockCount() >= 2) {
            throw new IllegalArgumentException("Maximum unblock limit exceeded (2 times max). You can no longer unblock this contact.");
        }

        contact.setUnblockCount(contact.getUnblockCount() + 1);
        contact.setStatus(ContactStatus.ACCEPTED);
        contactRepository.save(contact);

        // Safety hard-delete B -> A first to ensure no soft-deleted constraints clash
        User contactUser = contact.getContactUser();
        contactRepository.hardDeleteByUserAndContactUser(contactUser.getId(), user.getId());

        // Restore reverse contact relationship so they can message each other
        Contact reverseContact = Contact.builder()
                .user(contactUser)
                .contactUser(user)
                .status(ContactStatus.ACCEPTED)
                .unblockCount(0)
                .build();
        contactRepository.save(reverseContact);
    }

    @Override
    @Transactional
    public void updateContactAlias(User user, Long contactRecordId, String alias) {
        Contact contact = contactRepository.findById(contactRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact record not found"));

        if (!contact.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to this contact");
        }

        contact.setCustomName(alias != null && !alias.trim().isEmpty() ? alias.trim() : null);
        contactRepository.save(contact);
    }
}

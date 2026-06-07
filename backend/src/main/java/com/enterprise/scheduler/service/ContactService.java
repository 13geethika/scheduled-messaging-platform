package com.enterprise.scheduler.service;

import com.enterprise.scheduler.dto.ContactResponse;
import com.enterprise.scheduler.entity.User;
import java.util.List;

public interface ContactService {
    void sendContactRequest(User user, String contactEmail);
    List<ContactResponse> getContacts(User user, String status);
    List<ContactResponse> getPendingRequests(User user);
    void acceptContactRequest(User user, Long contactRecordId);
    void rejectContactRequest(User user, Long contactRecordId);
    void blockContact(User user, Long contactRecordId);
    void removeContact(User user, Long contactRecordId);
    List<ContactResponse> searchContacts(User user, String query);
}

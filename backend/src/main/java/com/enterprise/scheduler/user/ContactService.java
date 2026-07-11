package com.enterprise.scheduler.user;

import com.enterprise.scheduler.user.ContactResponse;
import com.enterprise.scheduler.user.User;
import java.util.List;

public interface ContactService {
    void sendContactRequest(User user, String contactEmail);
    List<ContactResponse> getContacts(User user, String status);
    List<ContactResponse> getPendingRequests(User user);
    void acceptContactRequest(User user, Long contactRecordId);
    void rejectContactRequest(User user, Long contactRecordId);
    void blockContact(User user, Long contactRecordId);
    void unblockContact(User user, Long contactRecordId);
    void updateContactAlias(User user, Long contactRecordId, String alias);
    void removeContact(User user, Long contactRecordId);
    List<ContactResponse> searchContacts(User user, String query);
}

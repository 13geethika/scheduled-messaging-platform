package com.enterprise.scheduler.user;

import com.enterprise.scheduler.user.Contact;
import com.enterprise.scheduler.user.ContactStatus;
import com.enterprise.scheduler.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findByUserAndStatus(User user, ContactStatus status);
    List<Contact> findByContactUserAndStatus(User contactUser, ContactStatus status);
    Optional<Contact> findByUserAndContactUser(User user, User contactUser);

    @Query("SELECT c FROM Contact c WHERE c.user.id = :userId AND c.status = :status AND " +
           "(LOWER(c.contactUser.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.contactUser.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Contact> searchContacts(@Param("userId") Long userId, 
                                 @Param("status") ContactStatus status, 
                                 @Param("query") String query);
}

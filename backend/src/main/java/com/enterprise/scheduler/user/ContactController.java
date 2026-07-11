package com.enterprise.scheduler.user;

import com.enterprise.scheduler.user.ContactResponse;
import com.enterprise.scheduler.user.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.user.UserRepository;
import com.enterprise.scheduler.user.ContactService;
import com.enterprise.scheduler.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;
    private final UserRepository userRepository;

    public ContactController(ContactService contactService, UserRepository userRepository) {
        this.contactService = contactService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<Void>> sendContactRequest(@RequestParam("email") String email) {
        User user = getAuthenticatedUser();
        contactService.sendContactRequest(user, email);
        return ResponseEntity.ok(ApiResponse.success("Contact request sent successfully", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContactResponse>>> getContacts(
            @RequestParam(value = "status", defaultValue = "ACCEPTED") String status) {
        User user = getAuthenticatedUser();
        List<ContactResponse> contacts = contactService.getContacts(user, status);
        return ResponseEntity.ok(ApiResponse.success("Contacts retrieved successfully", contacts));
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<ApiResponse<List<ContactResponse>>> getPendingRequests() {
        User user = getAuthenticatedUser();
        List<ContactResponse> requests = contactService.getPendingRequests(user);
        return ResponseEntity.ok(ApiResponse.success("Pending requests retrieved successfully", requests));
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<ApiResponse<Void>> acceptContactRequest(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.acceptContactRequest(user, id);
        return ResponseEntity.ok(ApiResponse.success("Contact request accepted", null));
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectContactRequest(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.rejectContactRequest(user, id);
        return ResponseEntity.ok(ApiResponse.success("Contact request rejected", null));
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<ApiResponse<Void>> blockContact(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.blockContact(user, id);
        return ResponseEntity.ok(ApiResponse.success("Contact blocked successfully", null));
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<ApiResponse<Void>> unblockContact(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.unblockContact(user, id);
        return ResponseEntity.ok(ApiResponse.success("Contact unblocked successfully", null));
    }

    @PutMapping("/{id}/alias")
    public ResponseEntity<ApiResponse<Void>> updateContactAlias(
            @PathVariable("id") Long id,
            @RequestParam("alias") String alias) {
        User user = getAuthenticatedUser();
        contactService.updateContactAlias(user, id, alias);
        return ResponseEntity.ok(ApiResponse.success("Contact alias updated successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeContact(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.removeContact(user, id);
        return ResponseEntity.ok(ApiResponse.success("Contact removed successfully", null));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ContactResponse>>> searchContacts(@RequestParam("query") String query) {
        User user = getAuthenticatedUser();
        List<ContactResponse> searchResult = contactService.searchContacts(user, query);
        return ResponseEntity.ok(ApiResponse.success("Search completed successfully", searchResult));
    }
}

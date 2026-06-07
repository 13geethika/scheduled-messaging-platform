package com.enterprise.scheduler.controller;

import com.enterprise.scheduler.dto.ContactResponse;
import com.enterprise.scheduler.entity.User;
import com.enterprise.scheduler.exception.ResourceNotFoundException;
import com.enterprise.scheduler.repository.UserRepository;
import com.enterprise.scheduler.service.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    public ResponseEntity<Map<String, String>> sendContactRequest(@RequestParam("email") String email) {
        User user = getAuthenticatedUser();
        contactService.sendContactRequest(user, email);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Contact request sent successfully.");
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ContactResponse>> getContacts(
            @RequestParam(value = "status", defaultValue = "ACCEPTED") String status) {
        User user = getAuthenticatedUser();
        List<ContactResponse> contacts = contactService.getContacts(user, status);
        return ResponseEntity.ok(contacts);
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<List<ContactResponse>> getPendingRequests() {
        User user = getAuthenticatedUser();
        List<ContactResponse> requests = contactService.getPendingRequests(user);
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<Map<String, String>> acceptContactRequest(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.acceptContactRequest(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Contact request accepted.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectContactRequest(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.rejectContactRequest(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Contact request rejected.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<Map<String, String>> blockContact(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.blockContact(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Contact blocked.");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> removeContact(@PathVariable("id") Long id) {
        User user = getAuthenticatedUser();
        contactService.removeContact(user, id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Contact removed.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ContactResponse>> searchContacts(@RequestParam("query") String query) {
        User user = getAuthenticatedUser();
        List<ContactResponse> searchResult = contactService.searchContacts(user, query);
        return ResponseEntity.ok(searchResult);
    }
}

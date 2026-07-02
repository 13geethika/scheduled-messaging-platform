package com.enterprise.scheduler.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ContactResponse {
    private Long id;
    private Long contactId;
    private String name;
    private String email;
    private String status;
    private String profilePhotoUrl;
    private int unreadCount;
}

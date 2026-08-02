package com.enterprise.scheduler.group;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupSettingsRequest {
    @NotBlank(message = "Group name cannot be blank")
    private String name;
    
    private String description;
    
    private boolean adminsOnlyMessaging;
}

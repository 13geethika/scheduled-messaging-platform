package com.enterprise.scheduler.group;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class ChatGroupRequest {
    @NotBlank(message = "Group name is required")
    private String name;

    private String description;

    @NotEmpty(message = "Group must have at least one member")
    private List<String> memberEmails;
}

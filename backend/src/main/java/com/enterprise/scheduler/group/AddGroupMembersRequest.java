package com.enterprise.scheduler.group;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class AddGroupMembersRequest {
    @NotEmpty(message = "Member emails list cannot be empty")
    private List<String> memberEmails;
}

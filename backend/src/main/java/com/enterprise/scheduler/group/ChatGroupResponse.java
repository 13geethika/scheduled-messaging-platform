package com.enterprise.scheduler.group;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupResponse {
    private Long id;
    private String name;
    private String description;
    private String createdByEmail;
    private String createdByName;
    private List<MemberInfo> members;
    private boolean adminsOnlyMessaging;
    private String groupPhotoUrl;
    private Instant createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Long id;
        private String name;
        private String email;
        private String profilePhotoUrl;
        private String role;
        private String status;
    }
}

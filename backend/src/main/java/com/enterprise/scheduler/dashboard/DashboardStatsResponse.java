package com.enterprise.scheduler.dashboard;
import com.enterprise.scheduler.message.MessageResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardStatsResponse {
    private long totalScheduled;
    private long deliveredCount;
    private long failedCount;
    private long pendingCount;
    private List<MessageResponse> upcomingMessages;
}

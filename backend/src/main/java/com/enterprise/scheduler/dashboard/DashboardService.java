package com.enterprise.scheduler.dashboard;

import com.enterprise.scheduler.dashboard.DashboardStatsResponse;
import com.enterprise.scheduler.user.User;

public interface DashboardService {
    DashboardStatsResponse getDashboardStats(User user);
}

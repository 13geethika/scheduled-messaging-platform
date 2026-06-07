package com.enterprise.scheduler.service;

import com.enterprise.scheduler.dto.DashboardStatsResponse;
import com.enterprise.scheduler.entity.User;

public interface DashboardService {
    DashboardStatsResponse getDashboardStats(User user);
}

package com.enterprise.scheduler.service;

import com.enterprise.scheduler.entity.Message;

public interface QuartzSchedulerService {
    void scheduleMessageJob(Message message);
    void rescheduleMessageJob(Message message);
    void deleteMessageJob(Long messageId);
    void pauseMessageJob(Long messageId);
    void resumeMessageJob(Long messageId);
}

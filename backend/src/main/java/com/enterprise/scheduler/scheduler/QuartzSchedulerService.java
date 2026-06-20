package com.enterprise.scheduler.scheduler;

import com.enterprise.scheduler.message.Message;

public interface QuartzSchedulerService {
    void scheduleMessageJob(Message message);
    void rescheduleMessageJob(Message message);
    void deleteMessageJob(Long messageId);
    void pauseMessageJob(Long messageId);
    void resumeMessageJob(Long messageId);
}

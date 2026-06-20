package com.enterprise.scheduler.scheduler;

import com.enterprise.scheduler.message.Message;
import com.enterprise.scheduler.message.RecurringType;
import com.enterprise.scheduler.scheduler.MessageDeliveryJob;
import com.enterprise.scheduler.scheduler.QuartzSchedulerService;
import org.quartz.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Service
public class QuartzSchedulerServiceImpl implements QuartzSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(QuartzSchedulerServiceImpl.class);

    private final Scheduler scheduler;

    public QuartzSchedulerServiceImpl(Scheduler scheduler) {
        this.scheduler = scheduler;
    }

    @Override
    public void scheduleMessageJob(Message message) {
        try {
            JobDetail jobDetail = buildJobDetail(message);
            Trigger trigger = buildTrigger(message);

            scheduler.scheduleJob(jobDetail, trigger);
            logger.info("Successfully scheduled Quartz job for message ID: {}", message.getId());
        } catch (SchedulerException e) {
            logger.error("Failed to schedule Quartz job for message ID: " + message.getId(), e);
            throw new RuntimeException("Scheduling failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void rescheduleMessageJob(Message message) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey("message-trigger-" + message.getId(), "message-triggers");
            Trigger newTrigger = buildTrigger(message);

            if (scheduler.checkExists(triggerKey)) {
                scheduler.rescheduleJob(triggerKey, newTrigger);
                logger.info("Successfully rescheduled Quartz job for message ID: {}", message.getId());
            } else {
                scheduleMessageJob(message);
            }
        } catch (SchedulerException e) {
            logger.error("Failed to reschedule Quartz job for message ID: " + message.getId(), e);
            throw new RuntimeException("Rescheduling failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteMessageJob(Long messageId) {
        try {
            JobKey jobKey = JobKey.jobKey("message-job-" + messageId, "message-jobs");
            if (scheduler.checkExists(jobKey)) {
                scheduler.deleteJob(jobKey);
                logger.info("Successfully deleted Quartz job for message ID: {}", messageId);
            }
        } catch (SchedulerException e) {
            logger.error("Failed to delete Quartz job for message ID: " + messageId, e);
            throw new RuntimeException("Deletion failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void pauseMessageJob(Long messageId) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey("message-trigger-" + messageId, "message-triggers");
            if (scheduler.checkExists(triggerKey)) {
                scheduler.pauseTrigger(triggerKey);
                logger.info("Successfully paused Quartz trigger for message ID: {}", messageId);
            }
        } catch (SchedulerException e) {
            logger.error("Failed to pause Quartz trigger for message ID: " + messageId, e);
            throw new RuntimeException("Pause failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void resumeMessageJob(Long messageId) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey("message-trigger-" + messageId, "message-triggers");
            if (scheduler.checkExists(triggerKey)) {
                scheduler.resumeTrigger(triggerKey);
                logger.info("Successfully resumed Quartz trigger for message ID: {}", messageId);
            }
        } catch (SchedulerException e) {
            logger.error("Failed to resume Quartz trigger for message ID: " + messageId, e);
            throw new RuntimeException("Resume failed: " + e.getMessage(), e);
        }
    }

    private JobDetail buildJobDetail(Message message) {
        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("messageId", message.getId());

        return JobBuilder.newJob(MessageDeliveryJob.class)
                .withIdentity("message-job-" + message.getId(), "message-jobs")
                .withDescription("Deliver message ID: " + message.getId())
                .usingJobData(jobDataMap)
                .storeDurably()
                .requestRecovery() // Enable job recovery on server restart
                .build();
    }

    private Trigger buildTrigger(Message message) {
        TriggerKey triggerKey = TriggerKey.triggerKey("message-trigger-" + message.getId(), "message-triggers");
        Instant scheduledTime = message.getScheduledTime();
        Date startTime = Date.from(scheduledTime);

        TriggerBuilder<Trigger> triggerBuilder = TriggerBuilder.newTrigger()
                .withIdentity(triggerKey)
                .startAt(startTime);

        if (message.getRecurringType() == RecurringType.NONE) {
            return triggerBuilder
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withMisfireHandlingInstructionFireNow())
                    .build();
        } else {
            String cronExp = getCronExpression(message);
            return triggerBuilder
                    .withSchedule(CronScheduleBuilder.cronSchedule(cronExp)
                            .withMisfireHandlingInstructionFireAndProceed())
                    .build();
        }
    }

    private String getCronExpression(Message message) {
        LocalDateTime time = LocalDateTime.ofInstant(message.getScheduledTime(), ZoneId.systemDefault());
        int minute = time.getMinute();
        int hour = time.getHour();

        if (message.getRecurringType() == RecurringType.DAILY) {
            return String.format("0 %d %d * * ?", minute, hour);
        } else if (message.getRecurringType() == RecurringType.WEEKLY) {
            int dayOfWeekVal = time.getDayOfWeek().getValue();
            String dwStr = switch (dayOfWeekVal) {
                case 7 -> "SUN";
                case 1 -> "MON";
                case 2 -> "TUE";
                case 3 -> "WED";
                case 4 -> "THU";
                case 5 -> "FRI";
                case 6 -> "SAT";
                default -> "?";
            };
            return String.format("0 %d %d ? * %s", minute, hour, dwStr);
        } else if (message.getRecurringType() == RecurringType.MONTHLY) {
            int dayOfMonth = time.getDayOfMonth();
            return String.format("0 %d %d %d * ?", minute, hour, dayOfMonth);
        }
        
        throw new IllegalArgumentException("Unsupported recurrence type: " + message.getRecurringType());
    }
}

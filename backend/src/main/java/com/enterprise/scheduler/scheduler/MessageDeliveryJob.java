package com.enterprise.scheduler.scheduler;

import com.enterprise.scheduler.service.MessageService;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

@Component
public class MessageDeliveryJob implements Job {

    private static final Logger logger = LoggerFactory.getLogger(MessageDeliveryJob.class);

    @Autowired
    private ApplicationContext applicationContext;

    // Quartz requires a no-args constructor
    public MessageDeliveryJob() {
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap dataMap = context.getMergedJobDataMap();
        Long messageId = dataMap.getLong("messageId");
        
        logger.info("Executing message delivery job for message ID: {}", messageId);

        try {
            // Fetch MessageService dynamically from ApplicationContext to ensure transactional safety
            MessageService messageService = applicationContext.getBean(MessageService.class);
            messageService.deliverMessage(messageId);
        } catch (Exception e) {
            logger.error("Failed to execute message delivery for ID: " + messageId, e);
            throw new JobExecutionException(e);
        }
    }
}

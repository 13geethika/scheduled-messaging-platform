package com.enterprise.scheduler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ScheduledMessagingApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScheduledMessagingApplication.class, args);
    }
}

//SELECT email_verification_token FROM users WHERE email='geethika.bodapati13@gmail.com';
//http://localhost:5173/verify-email?token=<PASTE_THE_TOKEN_HERE>
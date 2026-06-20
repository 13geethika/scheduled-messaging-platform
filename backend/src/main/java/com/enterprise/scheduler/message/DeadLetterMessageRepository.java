package com.enterprise.scheduler.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeadLetterMessageRepository extends JpaRepository<DeadLetterMessage, Long> {
}

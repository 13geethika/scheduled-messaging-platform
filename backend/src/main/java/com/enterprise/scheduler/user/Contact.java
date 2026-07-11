package com.enterprise.scheduler.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "contacts", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "contact_user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE contacts SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_user_id", nullable = false)
    private User contactUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContactStatus status;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @Column(name = "unblock_count", nullable = false)
    @Builder.Default
    private int unblockCount = 0;

    @Column(name = "custom_name")
    private String customName;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

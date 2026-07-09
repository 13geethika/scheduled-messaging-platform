package com.enterprise.scheduler.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

@Configuration
public class DatabaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:#{null}}")
    private String defaultUrl;

    @Value("${spring.datasource.username:#{null}}")
    private String defaultUsername;

    @Value("${spring.datasource.password:#{null}}")
    private String defaultPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String dbUrl = System.getenv("DB_URL");
        if (dbUrl == null || dbUrl.isEmpty()) {
            dbUrl = System.getenv("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isEmpty()) {
            dbUrl = defaultUrl;
        }

        if (dbUrl != null) {
            String cleanUrl = dbUrl;
            boolean wasJdbc = false;
            if (cleanUrl.startsWith("jdbc:postgresql://")) {
                cleanUrl = cleanUrl.substring(5); // strip "jdbc:" -> "postgresql://"
                wasJdbc = true;
            } else if (cleanUrl.startsWith("jdbc:mysql://")) {
                cleanUrl = cleanUrl.substring(5); // strip "jdbc:" -> "mysql://"
                wasJdbc = true;
            }

            if (cleanUrl.startsWith("postgres://") || cleanUrl.startsWith("postgresql://") || cleanUrl.startsWith("mysql://") || (wasJdbc && cleanUrl.contains("@"))) {
                logger.info("Found database URL with embedded credentials. Parsing and converting to standard JDBC format...");
                try {
                    String uriString = cleanUrl;
                    // Ensure scheme is valid for URI class
                    if (uriString.startsWith("postgres://")) {
                        uriString = "postgresql://" + uriString.substring(11);
                    }

                    URI uri = new URI(uriString);
                    String userInfo = uri.getUserInfo();
                    String username = defaultUsername;
                    String password = defaultPassword;

                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":");
                        username = parts[0];
                        password = parts[1];
                    }

                    String host = uri.getHost();
                    int port = uri.getPort();
                    String path = uri.getPath();

                    String protocol = "jdbc:postgresql://";
                    if (dbUrl.startsWith("jdbc:mysql:") || uriString.startsWith("mysql:")) {
                        protocol = "jdbc:mysql://";
                    }

                    if (port == -1) {
                        port = protocol.contains("mysql") ? 3306 : 5432;
                    }

                    String jdbcUrl = protocol + host + ":" + port + path;

                    // Render PostgreSQL requires SSL (sslmode=require)
                    if (protocol.contains("postgresql") && !jdbcUrl.contains("sslmode")) {
                        if (jdbcUrl.contains("?")) {
                            jdbcUrl += "&sslmode=require";
                        } else {
                            jdbcUrl += "?sslmode=require";
                        }
                    }

                    logger.info("Configuring HikariDataSource with auto-converted JDBC URL: {}", jdbcUrl);

                    HikariConfig config = new HikariConfig();
                    config.setJdbcUrl(jdbcUrl);
                    config.setUsername(username);
                    config.setPassword(password);
                    config.setDriverClassName(protocol.contains("mysql") ? "com.mysql.cj.jdbc.Driver" : "org.postgresql.Driver");

                    return new HikariDataSource(config);

                } catch (URISyntaxException e) {
                    logger.error("Failed to parse database URL: {}", dbUrl, e);
                }
            }
        }

        // Fallback to default Spring properties config
        logger.info("Using standard DataSource configuration with url: {}", defaultUrl);
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(defaultUrl);
        config.setUsername(defaultUsername);
        config.setPassword(defaultPassword);
        
        if (defaultUrl != null) {
            if (defaultUrl.startsWith("jdbc:mysql:")) {
                config.setDriverClassName("com.mysql.cj.jdbc.Driver");
            } else if (defaultUrl.startsWith("jdbc:postgresql:")) {
                config.setDriverClassName("org.postgresql.Driver");
            }
        }

        return new HikariDataSource(config);
    }
}

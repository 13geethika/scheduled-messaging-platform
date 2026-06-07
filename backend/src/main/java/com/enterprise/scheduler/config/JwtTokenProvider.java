package com.enterprise.scheduler.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${app.jwt.secret:your secret_key is 12345}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:900000}") // 15 mins default
    private long jwtExpirationInMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(this.jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMs);

        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String getEmailFromJWT(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        try {

            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(authToken);

            System.out.println("JWT VALID");

            return true;

        } catch (MalformedJwtException ex) {
            System.out.println("INVALID JWT TOKEN");
            ex.printStackTrace();

        } catch (ExpiredJwtException ex) {
            System.out.println("EXPIRED JWT TOKEN");
            ex.printStackTrace();

        } catch (UnsupportedJwtException ex) {
            System.out.println("UNSUPPORTED JWT TOKEN");
            ex.printStackTrace();

        } catch (IllegalArgumentException ex) {
            System.out.println("EMPTY JWT TOKEN");
            ex.printStackTrace();

        } catch (Exception ex) {
            System.out.println("UNKNOWN JWT ERROR");
            ex.printStackTrace();
        }

        return false;
    }
}

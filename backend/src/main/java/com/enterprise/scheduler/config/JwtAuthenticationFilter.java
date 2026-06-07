package com.enterprise.scheduler.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, CustomUserDetailsService customUserDetailsService) {
        this.tokenProvider = tokenProvider;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        try {

            System.out.println("========== JWT FILTER ==========");
            System.out.println("Request URI: " + request.getRequestURI());

            String jwt = getJwtFromRequest(request);

            System.out.println("JWT Present: " + (jwt != null));

            if (StringUtils.hasText(jwt)) {

                boolean valid = tokenProvider.validateToken(jwt);
                System.out.println("Token Valid: " + valid);

                if (valid) {

                    String username = tokenProvider.getEmailFromJWT(jwt);
                    System.out.println("Username from token: " + username);

                    UserDetails userDetails =
                            customUserDetailsService.loadUserByUsername(username);

                    System.out.println("User Found: " + (userDetails != null));

                    if (userDetails != null) {
                        System.out.println("Account Non Locked: "
                                + userDetails.isAccountNonLocked());

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities());

                        authentication.setDetails(
                                new WebAuthenticationDetailsSource()
                                        .buildDetails(request));

                        SecurityContextHolder.getContext()
                                .setAuthentication(authentication);

                        System.out.println("Authentication Set Successfully");
                    }
                }
            }

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

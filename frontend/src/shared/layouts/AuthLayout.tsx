import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
        py: 4,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
          top: '10%',
          left: '15%',
          animation: 'floatBubble 10s infinite alternate',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(236,72,153,0) 70%)',
          bottom: '10%',
          right: '15%',
          animation: 'floatBubble 14s infinite alternate-reverse',
        },
        '@keyframes floatBubble': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(50px, 50px) scale(1.1)' }
        }
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(to right, #818cf8, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            ChronosMsg
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Scheduled Messaging Application
          </Typography>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: '24px',
            backgroundColor: 'rgba(30, 41, 59, 0.45)',
            backdropFilter: 'blur(16px) saturate(120%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}
        >
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

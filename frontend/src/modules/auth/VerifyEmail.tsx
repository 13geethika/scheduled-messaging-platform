import React, { useEffect, useRef } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { verifyEmail } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, successMessage } = useSelector((state: RootState) => state.auth);
  
  const token = searchParams.get('token');
  const calledRef = useRef(false);

  useEffect(() => {
    if (token && !calledRef.current) {
      calledRef.current = true;
      dispatch(verifyEmail(token));
    }
  }, [token, dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3, color: '#f8fafc' }}>
        Email Verification
      </Typography>

      {loading && (
        <Box sx={{ my: 4 }}>
          <CircularProgress sx={{ color: '#818cf8', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#94a3b8' }}>
            Verifying your email token. Please wait...
          </Typography>
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            The verification token may be invalid or expired.
          </Typography>
        </Box>
      )}

      {!loading && successMessage && (
        <Box sx={{ width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            {successMessage}
          </Alert>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            Your account is now active and ready for scheduling.
          </Typography>
        </Box>
      )}

      {!token && (
        <Box sx={{ width: '100%' }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
            No token found in verification URL.
          </Alert>
        </Box>
      )}

      <Button
        component={RouterLink}
        to={PATHS.LOGIN}
        variant="contained"
        fullWidth
        sx={{
          py: 1.5,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
          color: '#fff',
          fontWeight: 700,
          textTransform: 'none',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          }
        }}
      >
        Go to Login
      </Button>
    </Box>
  );
};

export default VerifyEmail;

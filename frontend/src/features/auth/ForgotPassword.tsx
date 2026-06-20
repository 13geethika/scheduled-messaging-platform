import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Link, CircularProgress } from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { forgotPassword, clearAuthMessages } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';

const schema = yup.object().shape({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

const ForgotPassword: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, successMessage } = useSelector((state: RootState) => state.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  const onSubmit = (data: { email: string }) => {
    dispatch(forgotPassword(data.email));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2, color: '#f8fafc', textAlign: 'center' }}>
        Forgot Password
      </Typography>
      <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3, textAlign: 'center' }}>
        Enter your email address and we'll send you a link to reset your password.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Email Address"
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
          slotProps={{
            input: {
              style: { color: '#f8fafc' }
            }
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#818cf8' },
            },
            '& .MuiInputLabel-root': { color: '#94a3b8' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
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
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Send Reset Link'}
        </Button>
      </form>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Link
          component={RouterLink}
          to={PATHS.LOGIN}
          sx={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Back to Login
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword;

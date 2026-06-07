import React, { useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Button, TextField, Typography, Alert, Link, CircularProgress
} from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { login, clearAuthMessages } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';

const schema = yup.object().shape({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated, successMessage } = useSelector((state: RootState) => state.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(PATHS.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (data: any) => {
    dispatch(login(data));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3, color: '#f8fafc', textAlign: 'center' }}>
        Log In
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          autoComplete="email"
          autoFocus
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
          slotProps={{
            input: {
              style: { color: '#f8fafc' }
            }
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#818cf8' },
            },
            '& .MuiInputLabel-root': { color: '#94a3b8' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
          }}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
          slotProps={{
            input: {
              style: { color: '#f8fafc' }
            }
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#818cf8' },
            },
            '& .MuiInputLabel-root': { color: '#94a3b8' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Link
            component={RouterLink}
            to={PATHS.FORGOT_PASSWORD}
            variant="body2"
            sx={{ color: '#818cf8', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Forgot password?
          </Link>
        </Box>

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
            fontSize: '1rem',
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            }
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Log In'}
        </Button>
      </form>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Don't have an account?{' '}
          <Link
            component={RouterLink}
            to={PATHS.REGISTER}
            sx={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;

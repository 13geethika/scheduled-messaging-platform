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
import { registerUser, clearAuthMessages } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';

const schema = yup.object().shape({
  name: yup.string().min(2, 'Name must be at least 2 characters').max(50).required('Name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, successMessage, isAuthenticated } = useSelector((state: RootState) => state.auth);

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
    const { name, email, password } = data;
    dispatch(registerUser({ name, email, password }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3, color: '#f8fafc', textAlign: 'center' }}>
        Create Account
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Full Name"
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register('name')}
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

        <TextField
          margin="normal"
          required
          fullWidth
          label="Confirm Password"
          type="password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
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
            fontSize: '1rem',
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            }
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign Up'}
        </Button>
      </form>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
          Already have an account?{' '}
          <Link
            component={RouterLink}
            to={PATHS.LOGIN}
            sx={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Log In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Register;

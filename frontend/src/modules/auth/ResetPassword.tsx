import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, TextField, Typography, Alert, Link, CircularProgress } from '@mui/material';
import type { RootState, AppDispatch } from '../../store';
import { resetPassword, clearAuthMessages } from '../../store/auth/authSlice';
import { PATHS } from '../../routes/paths';

const schema = yup.object().shape({
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, successMessage } = useSelector((state: RootState) => state.auth);

  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        navigate(PATHS.LOGIN);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate]);

  const onSubmit = (data: any) => {
    if (token) {
      dispatch(resetPassword({ token, newPassword: data.password }));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3, color: '#f8fafc', textAlign: 'center' }}>
        Reset Password
      </Typography>

      {!token && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          Invalid or missing reset token. Please request a new password link.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{successMessage}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="New Password"
          type="password"
          disabled={!token}
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
          label="Confirm New Password"
          type="password"
          disabled={!token}
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
          disabled={loading || !token}
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
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Reset Password'}
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

export default ResetPassword;

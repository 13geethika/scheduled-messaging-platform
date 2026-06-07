import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { updateProfileName } from '../../store/auth/authSlice';
import {
  Box, Typography, Paper, TextField, Button, Grid, Avatar, Divider, Alert, CircularProgress
} from '@mui/material';

export const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    dispatch(updateProfileName(name.trim()))
      .then((res) => {
        if (res.toString().includes('rejected')) {
          setError('Failed to update profile name');
        } else {
          setSuccess('Profile name updated successfully');
        }
      });
  };

  return (
    <Box sx={{ maxWidth: 650, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#f8fafc', mb: 1 }}>
          Profile Settings
        </Typography>
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
          Manage your personal details, permissions, and security parameters.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

      <Paper sx={{ p: 4, bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2.5 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '2rem', fontWeight: 700 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              {user?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 4 }} />

        <form onSubmit={handleUpdate}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{
                  input: { style: { color: '#f8fafc' } }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                disabled
                label="Email Address"
                value={user?.email || ''}
                slotProps={{
                  input: { style: { color: '#64748b' } }
                }}
                sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(255,255,255,0.08)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                disabled
                label="Access Permission (Role)"
                value={user?.role || ''}
                slotProps={{
                  input: { style: { color: '#64748b' } }
                }}
                sx={{ '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(255,255,255,0.08)' } }}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.2, px: 3,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Profile Details'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Profile;

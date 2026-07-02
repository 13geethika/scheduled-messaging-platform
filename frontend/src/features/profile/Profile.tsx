import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { updateProfileName, updateProfilePhoto } from '../../store/auth/authSlice';
import { getMediaUrl } from '../../shared/services/api';
import {
  Box, Typography, Paper, TextField, Button, Grid, Avatar, Divider, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

export const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('themeMode') as 'light' | 'dark') || 'dark'
  );

  const handleThemeChange = (e: any) => {
    const val = e.target.value as 'light' | 'dark';
    setThemeMode(val);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSuccess(null);
    setError(null);

    dispatch(updateProfilePhoto(file))
      .then((res) => {
        if (res.toString().includes('rejected')) {
          setError('Failed to upload profile photo');
        } else {
          setSuccess('Profile photo updated successfully');
        }
      });
  };

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
          setError('Failed to update profile details');
        } else {
          localStorage.setItem('themeMode', themeMode);
          window.dispatchEvent(new Event('theme-change'));
          setSuccess('Profile details updated successfully');
        }
      });
  };

  return (
    <Box sx={{ maxWidth: 650, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
          Profile Settings
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Manage your personal details, permissions, and security parameters.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

      <Paper sx={{ p: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '20px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Avatar 
              src={getMediaUrl(user?.profilePhotoUrl) || undefined}
              sx={{ width: 80, height: 80, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '2.5rem', fontWeight: 700 }}
            >
              {!user?.profilePhotoUrl && user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.primary', '&:hover': { borderColor: 'primary.main' } }}
            >
              Change Photo
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </Button>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {user?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'divider', mb: 4 }} />

        <form onSubmit={handleUpdate}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{}}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                disabled
                label="Email Address"
                value={user?.email || ''}
                sx={{}}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Application Theme</InputLabel>
                <Select
                  value={themeMode}
                  label="Application Theme"
                  onChange={handleThemeChange}
                  sx={{ color: 'text.primary' }}
                >
                  <MenuItem value="dark">Dark Theme</MenuItem>
                  <MenuItem value="light">Light Theme</MenuItem>
                </Select>
              </FormControl>
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

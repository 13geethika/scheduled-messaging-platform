import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../shared/services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  profilePhotoUrl?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

// Initial state derived from local storage to preserve sessions
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('accessToken');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
  successMessage: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const data = response.data.data; // JwtResponse from ApiResponse.data
      
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      const user: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: 'ACTIVE',
        profilePhotoUrl: data.profilePhotoUrl
      };
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token: data.token, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.password || 'Authentication failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.email || 'Registration failed');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Verification failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Forgot password request failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/reset-password', data);
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Password reset failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Proceed to logout locally even if server-side call fails
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
);

export const updateProfileName = createAsyncThunk(
  'auth/updateProfileName',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await api.put('/profile', { name });
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.name = response.data.data.name;
        localStorage.setItem('user', JSON.stringify(u));
      }
      return response.data.data.name;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Profile update failed');
    }
  }
);

export const updateProfilePhoto = createAsyncThunk(
  'auth/updateProfilePhoto',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const photoUrl = response.data.data.profilePhotoUrl;
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.profilePhotoUrl = photoUrl;
        localStorage.setItem('user', JSON.stringify(u));
      }
      return photoUrl;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Photo upload failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    forcedLogout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload as string;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Verify Email
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload as string;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Update Name
      .addCase(updateProfileName.fulfilled, (state, action) => {
        if (state.user) {
          state.user.name = action.payload;
        }
      })
      // Update Photo
      .addCase(updateProfilePhoto.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfilePhoto.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.profilePhotoUrl = action.payload;
        }
      })
      .addCase(updateProfilePhoto.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAuthMessages, forcedLogout } = authSlice.actions;
export default authSlice.reducer;

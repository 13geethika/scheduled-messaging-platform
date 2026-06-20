import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../shared/services/api';

export interface Message {
  id: number;
  senderEmail: string;
  receiverEmail: string;
  receiverName: string;
  content: string;
  messageType: string;
  fileUrl: string | null;
  status: string;
  scheduledTime: string;
  sentTime: string | null;
  recurringType: string;
  retryCount: number;
  errorMessage: string | null;
}

export interface DashboardStats {
  totalScheduled: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  upcomingMessages: Message[];
}

interface MessagesState {
  messages: Message[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: MessagesState = {
  messages: [],
  stats: null,
  loading: false,
  error: null,
  successMessage: null,
};

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/messages');
      return response.data.data; // List of MessageResponse
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch messages');
    }
  }
);

export const scheduleMessage = createAsyncThunk(
  'messages/scheduleMessage',
  async (formData: FormData, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/messages/schedule', formData);
      dispatch(fetchMessages());
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to schedule message');
    }
  }
);

export const editMessage = createAsyncThunk(
  'messages/editMessage',
  async ({ id, formData }: { id: number; formData: FormData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.put(`/messages/${id}`, formData);
      dispatch(fetchMessages());
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to edit message');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'messages/deleteMessage',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/messages/${id}`);
      dispatch(fetchMessages());
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete message');
    }
  }
);

export const pauseMessage = createAsyncThunk(
  'messages/pauseMessage',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/messages/${id}/pause`);
      dispatch(fetchMessages());
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to pause message');
    }
  }
);

export const resumeMessage = createAsyncThunk(
  'messages/resumeMessage',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/messages/${id}/resume`);
      dispatch(fetchMessages());
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to resume message');
    }
  }
);

export const retryFailedMessage = createAsyncThunk(
  'messages/retryFailedMessage',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/messages/${id}/retry`);
      dispatch(fetchMessages());
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to retry message');
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'messages/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data.data; // DashboardStatsResponse
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard stats');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearMessageMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Schedule message
      .addCase(scheduleMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleMessage.fulfilled, (state) => {
        state.loading = false;
        state.successMessage = 'Message scheduled successfully';
      })
      .addCase(scheduleMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Edit message
      .addCase(editMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editMessage.fulfilled, (state) => {
        state.loading = false;
        state.successMessage = 'Message updated successfully';
      })
      .addCase(editMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearMessageMessages } = messagesSlice.actions;
export default messagesSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../shared/services/api';

export interface Contact {
  id: number;
  contactId: number;
  name: string;
  email: string;
  status: string;
}

interface ContactsState {
  contacts: Contact[];
  pendingRequests: Contact[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ContactsState = {
  contacts: [],
  pendingRequests: [],
  loading: false,
  error: null,
  successMessage: null,
};

export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (status: string = 'ACCEPTED', { rejectWithValue }) => {
    try {
      const response = await api.get(`/contacts?status=${status}`);
      return response.data; // List of ContactResponse
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch contacts');
    }
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'contacts/fetchPendingRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/contacts/requests/pending');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch pending requests');
    }
  }
);

export const sendContactRequest = createAsyncThunk(
  'contacts/sendContactRequest',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/request?email=${email}`);
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send contact request');
    }
  }
);

export const acceptContactRequest = createAsyncThunk(
  'contacts/acceptContactRequest',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/requests/${id}/accept`);
      dispatch(fetchPendingRequests());
      dispatch(fetchContacts('ACCEPTED'));
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to accept request');
    }
  }
);

export const rejectContactRequest = createAsyncThunk(
  'contacts/rejectContactRequest',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/requests/${id}/reject`);
      dispatch(fetchPendingRequests());
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to reject request');
    }
  }
);

export const blockContact = createAsyncThunk(
  'contacts/blockContact',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post(`/contacts/${id}/block`);
      dispatch(fetchContacts('ACCEPTED'));
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to block contact');
    }
  }
);

export const removeContact = createAsyncThunk(
  'contacts/removeContact',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.delete(`/contacts/${id}`);
      dispatch(fetchContacts('ACCEPTED'));
      return response.data.message;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove contact');
    }
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearContactMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Requests
      .addCase(fetchPendingRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingRequests = action.payload;
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Send Request
      .addCase(sendContactRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(sendContactRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload as string;
      })
      .addCase(sendContactRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearContactMessages } = contactsSlice.actions;
export default contactsSlice.reducer;

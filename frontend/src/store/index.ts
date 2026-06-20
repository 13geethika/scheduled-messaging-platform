import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import contactsReducer from './contacts/contactsSlice';
import messagesReducer from './messages/messagesSlice';
import { apiSlice } from './apiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    messages: messagesReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

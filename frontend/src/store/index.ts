import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import contactsReducer from './contacts/contactsSlice';
import messagesReducer from './messages/messagesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    messages: messagesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

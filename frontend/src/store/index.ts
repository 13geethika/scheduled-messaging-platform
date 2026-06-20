import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import contactsReducer from './contacts/contactsSlice';
import messagesReducer from './messages/messagesSlice';
import { apiSlice } from './apiSlice';

const appReducer = combineReducers({
  auth: authReducer,
  contacts: contactsReducer,
  messages: messagesReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout/fulfilled' || action.type === 'auth/forcedLogout') {
    // Reset all state to initial state on logout
    state = undefined;
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

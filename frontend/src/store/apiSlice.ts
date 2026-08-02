import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Message', 'Contact', 'Notification', 'Dashboard', 'AuditLog', 'Group'],
  endpoints: () => ({}),
});

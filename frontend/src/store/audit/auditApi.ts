import { apiSlice } from '../apiSlice';

export interface AuditLog {
  id: number;
  eventName: string;
  actor: string;
  ipAddress: string;
  actionDetails: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLog[], void>({
      query: () => ({
        url: '/audit-logs',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<AuditLog[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AuditLog' as const, id })),
              { type: 'AuditLog', id: 'LIST' },
            ]
          : [{ type: 'AuditLog', id: 'LIST' }],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;

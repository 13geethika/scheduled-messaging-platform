import { apiSlice } from '../apiSlice';

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
  isRead: boolean;
  replyToMessageId?: number | null;
  replyToMessageContent?: string | null;
  replyToMessageSenderName?: string | null;
}

export interface DashboardStats {
  totalScheduled: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  upcomingMessages: Message[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const messagesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<Message[], void>({
      query: () => ({
        url: '/messages',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Message[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Message' as const, id })),
              { type: 'Message', id: 'LIST' },
            ]
          : [{ type: 'Message', id: 'LIST' }],
    }),
    getChatHistory: builder.query<Message[], string>({
      query: (email) => ({
        url: `/messages/chat?email=${email}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Message[]>) => response.data,
      providesTags: (result, _error, email) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Message' as const, id })),
              { type: 'Message', id: `CHAT_${email}` },
              { type: 'Message', id: 'LIST' },
            ]
          : [{ type: 'Message', id: `CHAT_${email}` }, { type: 'Message', id: 'LIST' }],
    }),
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => ({
        url: '/dashboard/stats',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<DashboardStats>) => response.data,
      providesTags: [{ type: 'Dashboard', id: 'STATS' }],
    }),
    scheduleMessage: builder.mutation<ApiResponse<Message>, FormData>({
      query: (formData) => ({
        url: '/messages/schedule',
        method: 'POST',
        data: formData,
      }),
      invalidatesTags: (_result, _error, formData) => {
        const email = formData.get('receiverEmail') as string;
        return [
          { type: 'Message', id: 'LIST' },
          { type: 'Message', id: `CHAT_${email}` },
          { type: 'Dashboard', id: 'STATS' },
        ];
      },
    }),
    editMessage: builder.mutation<ApiResponse<Message>, { id: number; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/messages/${id}`,
        method: 'PUT',
        data: formData,
      }),
      invalidatesTags: (_result, _error, { id, formData }) => {
        const email = formData.get('receiverEmail') as string;
        return [
          { type: 'Message', id },
          { type: 'Message', id: 'LIST' },
          { type: 'Message', id: `CHAT_${email}` },
          { type: 'Dashboard', id: 'STATS' },
        ];
      },
    }),
    deleteMessage: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/messages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Message', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
    deleteMessageForMe: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/messages/${id}/delete-for-me`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Message', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
    pauseMessage: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/messages/${id}/pause`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Message', id },
        { type: 'Message', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
    resumeMessage: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/messages/${id}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Message', id },
        { type: 'Message', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
    retryFailedMessage: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/messages/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Message', id },
        { type: 'Message', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
    readChat: builder.mutation<ApiResponse<any>, string>({
      query: (email) => ({
        url: `/messages/chat/read?email=${email}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, email) => [
        { type: 'Contact', id: 'LIST' },
        { type: 'Message', id: `CHAT_${email}` },
      ],
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useGetChatHistoryQuery,
  useGetDashboardStatsQuery,
  useScheduleMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useDeleteMessageForMeMutation,
  usePauseMessageMutation,
  useResumeMessageMutation,
  useRetryFailedMessageMutation,
  useReadChatMutation,
} = messagesApi;

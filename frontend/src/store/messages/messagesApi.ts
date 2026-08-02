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
  groupId?: number | null;
  groupName?: string | null;
}

export interface ChatGroup {
  id: number;
  name: string;
  description: string | null;
  createdByEmail: string;
  createdByName: string;
  members: {
    id: number;
    name: string;
    email: string;
    profilePhotoUrl: string | null;
    role: string;
    status: string;
  }[];
  adminsOnlyMessaging: boolean;
  groupPhotoUrl: string | null;
  createdAt: string;
}

export interface ChatGroupRequest {
  name: string;
  description?: string;
  memberEmails: string[];
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
        const groupId = formData.get('groupId') as string;
        const tags: any[] = [
          { type: 'Message', id: 'LIST' },
          { type: 'Dashboard', id: 'STATS' },
        ];
        if (email) tags.push({ type: 'Message', id: `CHAT_${email}` });
        if (groupId) tags.push({ type: 'Message', id: `GROUP_CHAT_${groupId}` });
        return tags;
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
        const groupId = formData.get('groupId') as string;
        const tags: any[] = [
          { type: 'Message', id },
          { type: 'Message', id: 'LIST' },
          { type: 'Dashboard', id: 'STATS' },
        ];
        if (email) tags.push({ type: 'Message', id: `CHAT_${email}` });
        if (groupId) tags.push({ type: 'Message', id: `GROUP_CHAT_${groupId}` });
        return tags;
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
    getGroups: builder.query<ChatGroup[], void>({
      query: () => ({
        url: '/groups',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<ChatGroup[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Group' as const, id })),
              { type: 'Group', id: 'LIST' },
            ]
          : [{ type: 'Group', id: 'LIST' }],
    }),
    createGroup: builder.mutation<ApiResponse<ChatGroup>, ChatGroupRequest>({
      query: (body) => ({
        url: '/groups',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: [{ type: 'Group', id: 'LIST' }],
    }),
    getGroupChatHistory: builder.query<Message[], number>({
      query: (groupId) => ({
        url: `/messages/group/${groupId}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Message[]>) => response.data,
      providesTags: (result, _error, groupId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Message' as const, id })),
              { type: 'Message', id: `GROUP_CHAT_${groupId}` },
              { type: 'Message', id: 'LIST' },
            ]
          : [{ type: 'Message', id: `GROUP_CHAT_${groupId}` }, { type: 'Message', id: 'LIST' }],
    }),
    getPendingInvitations: builder.query<ChatGroup[], void>({
      query: () => ({
        url: '/groups/invitations',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<ChatGroup[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Group' as const, id })),
              { type: 'Group', id: 'INVITATIONS' },
            ]
          : [{ type: 'Group', id: 'INVITATIONS' }],
    }),
    acceptInvitation: builder.mutation<ApiResponse<void>, number>({
      query: (groupId) => ({
        url: `/groups/${groupId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Group', id: 'LIST' },
        { type: 'Group', id: 'INVITATIONS' },
      ],
    }),
    leaveGroup: builder.mutation<ApiResponse<void>, number>({
      query: (groupId) => ({
        url: `/groups/${groupId}/leave`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Group', id: 'LIST' },
      ],
    }),
    makeAdmin: builder.mutation<ApiResponse<void>, { groupId: number; userId: number }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}/make-admin`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'Group', id: 'LIST' },
      ],
    }),
    updateGroupSettings: builder.mutation<ApiResponse<ChatGroup>, { groupId: number; name: string; description?: string; adminsOnlyMessaging: boolean }>({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}/settings`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'Group', id: 'LIST' },
      ],
    }),
    updateGroupPhoto: builder.mutation<ApiResponse<ChatGroup>, { groupId: number; formData: FormData }>({
      query: ({ groupId, formData }) => ({
        url: `/groups/${groupId}/photo`,
        method: 'POST',
        data: formData,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'Group', id: 'LIST' },
      ],
    }),
    addGroupMembers: builder.mutation<ApiResponse<void>, { groupId: number; memberEmails: string[] }>({
      query: ({ groupId, memberEmails }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        data: { memberEmails },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'Group', id: 'LIST' },
      ],
    }),
    removeGroupMember: builder.mutation<ApiResponse<void>, { groupId: number; userId: number }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'Group', id: 'LIST' },
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
  useGetGroupsQuery,
  useCreateGroupMutation,
  useGetGroupChatHistoryQuery,
  useGetPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useLeaveGroupMutation,
  useMakeAdminMutation,
  useUpdateGroupSettingsMutation,
  useUpdateGroupPhotoMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
} = messagesApi;

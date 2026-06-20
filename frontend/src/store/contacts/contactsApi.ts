import { apiSlice } from '../apiSlice';

export interface Contact {
  id: number;
  contactId: number;
  name: string;
  email: string;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const contactsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<Contact[], string | undefined>({
      query: (status = 'ACCEPTED') => ({
        url: `/contacts?status=${status}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Contact[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Contact' as const, id })),
              { type: 'Contact', id: 'LIST' },
            ]
          : [{ type: 'Contact', id: 'LIST' }],
    }),
    getPendingRequests: builder.query<Contact[], void>({
      query: () => ({
        url: '/contacts/requests/pending',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Contact[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Contact' as const, id })),
              { type: 'Contact', id: 'PENDING_LIST' },
            ]
          : [{ type: 'Contact', id: 'PENDING_LIST' }],
    }),
    sendContactRequest: builder.mutation<ApiResponse<any>, string>({
      query: (email) => ({
        url: `/contacts/request?email=${email}`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Contact', id: 'PENDING_LIST' }],
    }),
    acceptContactRequest: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/contacts/requests/${id}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Contact', id: 'LIST' },
        { type: 'Contact', id: 'PENDING_LIST' },
      ],
    }),
    rejectContactRequest: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/contacts/requests/${id}/reject`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Contact', id: 'PENDING_LIST' }],
    }),
    blockContact: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/contacts/${id}/block`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Contact', id: 'LIST' }],
    }),
    removeContact: builder.mutation<ApiResponse<any>, number>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Contact', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useGetPendingRequestsQuery,
  useSendContactRequestMutation,
  useAcceptContactRequestMutation,
  useRejectContactRequestMutation,
  useBlockContactMutation,
  useRemoveContactMutation,
} = contactsApi;

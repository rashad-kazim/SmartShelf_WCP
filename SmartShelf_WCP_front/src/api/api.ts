import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { logout, setCredentials } from '@/features/auth/authSlice';
import { saveStoredAuth } from '@/features/auth/storage';
import type { DashboardQueryArgs, DashboardSummary, ActivityFeedItem } from '@/features/dashboard/types';
import type { StoreFiltersState } from '@/features/stores/types';
import type { Device, InstallationFormData } from '@/features/store-workflow/types';
import type {
  AuthMeResponse,
  AuthResponse,
  CompanyUser,
  CompleteInstallationResult,
  DeviceLogRecord,
  DeviceLogsQueryArgs,
  InstallationDraftResponse,
  Layer2Details,
  NotificationItem,
  PaginationMeta,
  StoreConfigurationResponse,
  StoreRecord,
  StoreSummaryResponse,
  StoreWorkflowPayload,
  SupermarketUser,
  UserPreferences,
} from './contracts';

type ApiEnvelope<T> = {
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
};

type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8080';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api/v1`,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as { auth?: { token?: string | null } };
    const token = state.auth?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

const baseQuery: BaseQueryFn<string | FetchArgs, ApiEnvelope<unknown>, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const state = api.getState() as {
    auth?: {
      token?: string | null;
      refreshToken?: string | null;
      user?: AuthResponse['user'] | null;
    };
  };

  if (result.error?.status === 401 && state.auth?.refreshToken) {
    const refreshResult = await rawBaseQuery(
      {
        url: '/auth/refresh',
        method: 'POST',
        body: {
          refresh_token: state.auth.refreshToken,
        },
      },
      api,
      extraOptions,
    );

    if ('data' in refreshResult && refreshResult.data) {
      const refreshEnvelope = refreshResult.data as ApiEnvelope<AuthResponse>;
      const authPayload = {
        user: refreshEnvelope.data.user,
        token: refreshEnvelope.data.access_token,
        refreshToken: refreshEnvelope.data.refresh_token,
      };
      api.dispatch(setCredentials(authPayload));
      saveStoredAuth(authPayload);
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  if (result.error) {
    return { error: result.error };
  }
  return { data: result.data as ApiEnvelope<unknown> };
};

const unwrapData = <T>(response: ApiEnvelope<T>): T => response.data;

const unwrapPaginated = <T>(response: ApiEnvelope<T[]>): PaginatedResult<T> => ({
  items: response.data,
  meta: response.meta ?? { page: 1, limit: response.data.length, total: response.data.length },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Auth',
    'Preference',
    'Dashboard',
    'Store',
    'StoreDevice',
    'CompanyUser',
    'SupermarketUser',
    'Notification',
    'Reference',
    'Installation',
  ],
  endpoints: (builder) => ({
    loginAdmin: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<AuthResponse>) => unwrapData(response),
    }),

    refreshAuth: builder.mutation<AuthResponse, { refresh_token: string }>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<AuthResponse>) => unwrapData(response),
    }),

    logoutAuth: builder.mutation<{ status: string }, { refresh_token?: string } | void>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<{ status: string }>) => unwrapData(response),
    }),

    getMe: builder.query<AuthMeResponse, void>({
      query: () => '/auth/me',
      transformResponse: (response: ApiEnvelope<AuthMeResponse>) => unwrapData(response),
      providesTags: [{ type: 'Auth', id: 'ME' }],
    }),

    getPreferences: builder.query<UserPreferences, void>({
      query: () => '/preferences/me',
      transformResponse: (response: ApiEnvelope<UserPreferences>) => unwrapData(response),
      providesTags: [{ type: 'Preference', id: 'ME' }],
    }),

    updatePreferences: builder.mutation<UserPreferences, UserPreferences>({
      query: (body) => ({
        url: '/preferences/me',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiEnvelope<UserPreferences>) => unwrapData(response),
      invalidatesTags: [{ type: 'Preference', id: 'ME' }, { type: 'Auth', id: 'ME' }],
    }),

    getCountries: builder.query<string[], void>({
      query: () => '/reference/countries',
      transformResponse: (response: ApiEnvelope<string[]>) => unwrapData(response),
      providesTags: [{ type: 'Reference', id: 'COUNTRIES' }],
    }),

    getCities: builder.query<string[], string>({
      query: (country) => `/reference/cities?country=${encodeURIComponent(country)}`,
      transformResponse: (response: ApiEnvelope<string[]>) => unwrapData(response),
      providesTags: (_result, _error, country) => [{ type: 'Reference', id: `CITIES-${country}` }],
    }),

    getSupermarkets: builder.query<string[], string>({
      query: (city) => `/reference/supermarkets?city=${encodeURIComponent(city)}`,
      transformResponse: (response: ApiEnvelope<string[]>) => unwrapData(response),
      providesTags: (_result, _error, city) => [{ type: 'Reference', id: `SUPERMARKETS-${city}` }],
    }),

    getDashboardSummary: builder.query<DashboardSummary, Partial<DashboardQueryArgs> | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.range) params.set('range', args.range);
        if (args?.country) params.set('country', args.country);
        if (args?.city) params.set('city', args.city);
        return `/dashboard/summary?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<DashboardSummary>) => unwrapData(response),
      providesTags: [{ type: 'Dashboard', id: 'SUMMARY' }],
    }),

    getActivityFeed: builder.query<ActivityFeedItem[], Partial<DashboardQueryArgs> | void>({
      query: () => '/dashboard/activity-feed',
      transformResponse: (response: ApiEnvelope<ActivityFeedItem[]>) => unwrapData(response),
      providesTags: [{ type: 'Dashboard', id: 'ACTIVITY' }],
    }),

    getNotifications: builder.query<NotificationItem[], void>({
      query: () => '/notifications?page=1&limit=100',
      transformResponse: (response: ApiEnvelope<NotificationItem[]>) => unwrapData(response),
      providesTags: (result) =>
        result
          ? [{ type: 'Notification', id: 'LIST' }, ...result.map((item) => ({ type: 'Notification' as const, id: item.id }))]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    markNotificationRead: builder.mutation<{ status: string }, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      transformResponse: (response: ApiEnvelope<{ status: string }>) => unwrapData(response),
      invalidatesTags: (_result, _error, id) => [{ type: 'Notification', id }, { type: 'Notification', id: 'LIST' }],
    }),

    acknowledgeNotification: builder.mutation<{ status: string }, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/ack`,
        method: 'PATCH',
      }),
      transformResponse: (response: ApiEnvelope<{ status: string }>) => unwrapData(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Dashboard', id: 'SUMMARY' },
      ],
    }),

    silenceNotification: builder.mutation<{ status: string }, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/silence`,
        method: 'PATCH',
      }),
      transformResponse: (response: ApiEnvelope<{ status: string }>) => unwrapData(response),
      invalidatesTags: (_result, _error, id) => [{ type: 'Notification', id }, { type: 'Notification', id: 'LIST' }],
    }),

    getStores: builder.query<StoreRecord[], Partial<StoreFiltersState> | void>({
      query: (filters) => {
        const params = new URLSearchParams({ page: '1', limit: '100' });
        if (filters?.country) params.set('country', filters.country);
        if (filters?.city) params.set('city', filters.city);
        if (filters?.supermarket) params.set('supermarket', filters.supermarket);
        return `/stores?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<StoreRecord[]>) => unwrapData(response),
      providesTags: (result) =>
        result
          ? [{ type: 'Store', id: 'LIST' }, ...result.map((store) => ({ type: 'Store' as const, id: store.id }))]
          : [{ type: 'Store', id: 'LIST' }],
    }),

    getStoreSummary: builder.query<StoreSummaryResponse, string | number>({
      query: (storeId) => `/stores/${storeId}/summary`,
      transformResponse: (response: ApiEnvelope<StoreSummaryResponse>) => unwrapData(response),
      providesTags: (_result, _error, storeId) => [{ type: 'Store', id: Number(storeId) }],
    }),

    getLayer2Details: builder.query<Layer2Details, string | number>({
      query: (storeId) => `/stores/${storeId}/layer2`,
      transformResponse: (response: ApiEnvelope<Layer2Details>) => unwrapData(response),
      providesTags: (_result, _error, storeId) => [{ type: 'Store', id: `LAYER2-${storeId}` }],
    }),

    getStoreDevices: builder.query<Device[], string | number>({
      query: (storeId) => `/stores/${storeId}/devices`,
      transformResponse: (response: ApiEnvelope<Device[]>) => unwrapData(response),
      providesTags: (_result, _error, storeId) => [{ type: 'StoreDevice', id: Number(storeId) }],
    }),

    getStoreConfiguration: builder.query<StoreConfigurationResponse, string | number>({
      async queryFn(storeId, _api, _extraOptions, baseQueryFn) {
        const [storeResult, devicesResult] = await Promise.all([
          baseQueryFn(`/stores/${storeId}`),
          baseQueryFn(`/stores/${storeId}/devices`),
        ]);

        if ('error' in storeResult && storeResult.error) {
          return { error: storeResult.error };
        }
        if ('error' in devicesResult && devicesResult.error) {
          return { error: devicesResult.error };
        }

        const storeEnvelope = storeResult.data as ApiEnvelope<StoreRecord>;
        const devicesEnvelope = devicesResult.data as ApiEnvelope<Device[]>;
        return {
          data: {
            store: {
              country: storeEnvelope.data.country,
              city: storeEnvelope.data.city,
              storeName: storeEnvelope.data.name,
              isBranch: Boolean(storeEnvelope.data.branch_name),
              branchName: storeEnvelope.data.branch_name ?? '',
              address: storeEnvelope.data.address ?? '',
              allDayOpen: !storeEnvelope.data.opening_hour && !storeEnvelope.data.closing_hour,
              openingHour: storeEnvelope.data.opening_hour ?? '',
              closingHour: storeEnvelope.data.closing_hour ?? '',
              ownerName: storeEnvelope.data.owner_name ?? '',
              ownerSurname: storeEnvelope.data.owner_surname ?? '',
            },
            devices: devicesEnvelope.data,
          },
        };
      },
      providesTags: (_result, _error, storeId) => [
        { type: 'Store', id: Number(storeId) },
        { type: 'StoreDevice', id: Number(storeId) },
      ],
    }),

    getDeviceLogs: builder.query<PaginatedResult<DeviceLogRecord>, DeviceLogsQueryArgs>({
      query: ({ storeId, date, packetIndex, batteryStatus, statusCode, reportType, criticalOnly, page, limit }) => {
        const params = new URLSearchParams({
          date,
          packet_index: packetIndex,
          battery_status: batteryStatus,
          status_code: statusCode,
          report_type: reportType,
          critical_only: String(criticalOnly),
          page: String(page),
          limit: String(limit),
        });
        return `/stores/${storeId}/device-logs?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<DeviceLogRecord[]>) => unwrapPaginated(response),
      providesTags: (_result, _error, { storeId }) => [{ type: 'Store', id: `LOGS-${storeId}` }],
    }),

    updateStore: builder.mutation<StoreRecord, { storeId: string | number; payload: StoreWorkflowPayload }>({
      query: ({ storeId, payload }) => ({
        url: `/stores/${storeId}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiEnvelope<StoreRecord>) => unwrapData(response),
      invalidatesTags: (_result, _error, { storeId }) => [{ type: 'Store', id: Number(storeId) }, { type: 'Store', id: 'LIST' }],
    }),

    replaceStoreDevices: builder.mutation<{ saved_count: number }, { storeId: string | number; devices: Device[] }>({
      query: ({ storeId, devices }) => ({
        url: `/stores/${storeId}/devices`,
        method: 'PUT',
        body: devices,
      }),
      transformResponse: (response: ApiEnvelope<{ saved_count: number }>) => unwrapData(response),
      invalidatesTags: (_result, _error, { storeId }) => [
        { type: 'StoreDevice', id: Number(storeId) },
        { type: 'Store', id: Number(storeId) },
        { type: 'Store', id: 'LIST' },
      ],
    }),

    deleteStore: builder.mutation<void, number>({
      query: (storeId) => ({
        url: `/stores/${storeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Store', id: 'LIST' }, { type: 'Dashboard', id: 'SUMMARY' }],
    }),

    getCompanyUsers: builder.query<CompanyUser[], Partial<StoreFiltersState> | void>({
      query: (filters) => {
        const params = new URLSearchParams({ page: '1', limit: '100' });
        if (filters?.country) params.set('country', filters.country);
        if (filters?.city) params.set('city', filters.city);
        return `/company-users?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<CompanyUser[]>) => unwrapData(response),
      providesTags: (result) =>
        result
          ? [{ type: 'CompanyUser', id: 'LIST' }, ...result.map((item) => ({ type: 'CompanyUser' as const, id: item.id }))]
          : [{ type: 'CompanyUser', id: 'LIST' }],
    }),

    getCompanyUserById: builder.query<CompanyUser, string | number>({
      query: (userId) => `/company-users/${userId}`,
      transformResponse: (response: ApiEnvelope<CompanyUser>) => unwrapData(response),
      providesTags: (_result, _error, userId) => [{ type: 'CompanyUser', id: Number(userId) }],
    }),

    addCompanyUser: builder.mutation<CompanyUser, Omit<CompanyUser, 'id'>>({
      query: (body) => ({
        url: '/company-users',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<CompanyUser>) => unwrapData(response),
      invalidatesTags: [{ type: 'CompanyUser', id: 'LIST' }],
    }),

    updateCompanyUser: builder.mutation<CompanyUser, { userId: string | number; userData: Omit<CompanyUser, 'id'> }>({
      query: ({ userId, userData }) => ({
        url: `/company-users/${userId}`,
        method: 'PATCH',
        body: userData,
      }),
      transformResponse: (response: ApiEnvelope<CompanyUser>) => unwrapData(response),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'CompanyUser', id: Number(userId) },
        { type: 'CompanyUser', id: 'LIST' },
      ],
    }),

    deleteCompanyUser: builder.mutation<void, string | number>({
      query: (userId) => ({
        url: `/company-users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'CompanyUser', id: Number(userId) },
        { type: 'CompanyUser', id: 'LIST' },
      ],
    }),

    getSupermarketUsers: builder.query<SupermarketUser[], Partial<StoreFiltersState> | void>({
      query: (filters) => {
        const params = new URLSearchParams({ page: '1', limit: '100' });
        if (filters?.country) params.set('country', filters.country);
        if (filters?.city) params.set('city', filters.city);
        if (filters?.supermarket) params.set('workplace', filters.supermarket);
        return `/supermarket-users?${params.toString()}`;
      },
      transformResponse: (response: ApiEnvelope<SupermarketUser[]>) => unwrapData(response),
      providesTags: (result) =>
        result
          ? [
              { type: 'SupermarketUser', id: 'LIST' },
              ...result.map((item) => ({ type: 'SupermarketUser' as const, id: item.id })),
            ]
          : [{ type: 'SupermarketUser', id: 'LIST' }],
    }),

    getSupermarketUserById: builder.query<SupermarketUser, string | number>({
      query: (userId) => `/supermarket-users/${userId}`,
      transformResponse: (response: ApiEnvelope<SupermarketUser>) => unwrapData(response),
      providesTags: (_result, _error, userId) => [{ type: 'SupermarketUser', id: Number(userId) }],
    }),

    addSupermarketUser: builder.mutation<SupermarketUser, Omit<SupermarketUser, 'id'>>({
      query: (body) => ({
        url: '/supermarket-users',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<SupermarketUser>) => unwrapData(response),
      invalidatesTags: [{ type: 'SupermarketUser', id: 'LIST' }],
    }),

    updateSupermarketUser: builder.mutation<
      SupermarketUser,
      { userId: string | number; userData: Omit<SupermarketUser, 'id'> }
    >({
      query: ({ userId, userData }) => ({
        url: `/supermarket-users/${userId}`,
        method: 'PATCH',
        body: userData,
      }),
      transformResponse: (response: ApiEnvelope<SupermarketUser>) => unwrapData(response),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'SupermarketUser', id: Number(userId) },
        { type: 'SupermarketUser', id: 'LIST' },
      ],
    }),

    deleteSupermarketUser: builder.mutation<void, string | number>({
      query: (userId) => ({
        url: `/supermarket-users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'SupermarketUser', id: Number(userId) },
        { type: 'SupermarketUser', id: 'LIST' },
      ],
    }),

    createInstallationDraft: builder.mutation<InstallationDraftResponse, StoreWorkflowPayload>({
      query: (body) => ({
        url: '/installation-drafts',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<InstallationDraftResponse>) => unwrapData(response),
      invalidatesTags: [{ type: 'Installation', id: 'DRAFT' }],
    }),

    updateInstallationDraft: builder.mutation<InstallationDraftResponse, { draftId: string; payload: StoreWorkflowPayload }>({
      query: ({ draftId, payload }) => ({
        url: `/installation-drafts/${draftId}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiEnvelope<InstallationDraftResponse>) => unwrapData(response),
      invalidatesTags: (_result, _error, { draftId }) => [{ type: 'Installation', id: draftId }],
    }),

    generateMasterToken: builder.mutation<{ token: string }, string>({
      query: (draftId) => ({
        url: `/installation-drafts/${draftId}/master-token`,
        method: 'POST',
      }),
      transformResponse: (response: ApiEnvelope<{ token: string }>) => unwrapData(response),
      invalidatesTags: (_result, _error, draftId) => [{ type: 'Installation', id: draftId }],
    }),

    checkDraftConnection: builder.mutation<{ connected: boolean }, string>({
      query: (draftId) => ({
        url: `/installation-drafts/${draftId}/connection-check`,
        method: 'POST',
      }),
      transformResponse: (response: ApiEnvelope<{ connected: boolean }>) => unwrapData(response),
      invalidatesTags: (_result, _error, draftId) => [{ type: 'Installation', id: draftId }],
    }),

    generateEspToken: builder.mutation<{ token: string }, string>({
      query: (draftId) => ({
        url: `/installation-drafts/${draftId}/esp-token`,
        method: 'POST',
      }),
      transformResponse: (response: ApiEnvelope<{ token: string }>) => unwrapData(response),
      invalidatesTags: (_result, _error, draftId) => [{ type: 'Installation', id: draftId }],
    }),

    saveDraftDevices: builder.mutation<{ saved_count: number }, { draftId: string; devices: Device[] }>({
      query: ({ draftId, devices }) => ({
        url: `/installation-drafts/${draftId}/devices`,
        method: 'PUT',
        body: { devices },
      }),
      transformResponse: (response: ApiEnvelope<{ saved_count: number }>) => unwrapData(response),
      invalidatesTags: (_result, _error, { draftId }) => [{ type: 'Installation', id: draftId }],
    }),

    completeInstallation: builder.mutation<CompleteInstallationResult, { draftId: string; idempotencyKey: string }>({
      query: ({ draftId, idempotencyKey }) => ({
        url: `/installation-drafts/${draftId}/complete`,
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }),
      transformResponse: (response: ApiEnvelope<CompleteInstallationResult>) => unwrapData(response),
      invalidatesTags: [{ type: 'Store', id: 'LIST' }, { type: 'Dashboard', id: 'SUMMARY' }],
    }),
  }),
});

export const {
  useLoginAdminMutation,
  useRefreshAuthMutation,
  useLogoutAuthMutation,
  useGetMeQuery,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetCountriesQuery,
  useGetCitiesQuery,
  useGetSupermarketsQuery,
  useGetDashboardSummaryQuery,
  useGetActivityFeedQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useAcknowledgeNotificationMutation,
  useSilenceNotificationMutation,
  useGetStoresQuery,
  useGetStoreSummaryQuery,
  useGetLayer2DetailsQuery,
  useGetStoreDevicesQuery,
  useGetStoreConfigurationQuery,
  useGetDeviceLogsQuery,
  useUpdateStoreMutation,
  useReplaceStoreDevicesMutation,
  useDeleteStoreMutation,
  useGetCompanyUsersQuery,
  useGetCompanyUserByIdQuery,
  useAddCompanyUserMutation,
  useUpdateCompanyUserMutation,
  useDeleteCompanyUserMutation,
  useGetSupermarketUsersQuery,
  useGetSupermarketUserByIdQuery,
  useAddSupermarketUserMutation,
  useUpdateSupermarketUserMutation,
  useDeleteSupermarketUserMutation,
  useCreateInstallationDraftMutation,
  useUpdateInstallationDraftMutation,
  useGenerateMasterTokenMutation,
  useCheckDraftConnectionMutation,
  useGenerateEspTokenMutation,
  useSaveDraftDevicesMutation,
  useCompleteInstallationMutation,
} = api;

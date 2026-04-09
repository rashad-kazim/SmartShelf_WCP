import type { Device, InstallationFormData } from '@/features/store-workflow/types';
import type { DashboardSummary, ActivityFeedItem } from '@/features/dashboard/types';
import type { AuthUser, UserPreferences } from '@/features/auth/types';

export type { AuthUser, UserPreferences, DashboardSummary, ActivityFeedItem, Device, InstallationFormData };

export interface CountryOption {
  code: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  permissions: string[];
  preferences: UserPreferences;
}

export interface AuthMeResponse {
  user: AuthUser;
  permissions: string[];
  preferences: UserPreferences;
}

export interface StoreRecord {
  id: number;
  name: string;
  country: string;
  city: string;
  status: 'Active' | 'Inactive';
  devices: number;
  address?: string;
  branch_name?: string;
  opening_hour?: string;
  closing_hour?: string;
  owner_name?: string;
  owner_surname?: string;
  created_at?: string;
}

export interface Layer2Details {
  store_id: number;
  layer2_id: string;
  layer1_version: string;
  layer2_version: string;
  esp32_count: number;
  status: string;
  last_heartbeat_at: string | null;
  last_sync_at: string | null;
  sync_status: string;
  pending_sync_data: number;
  gateway_ip: string;
  gateway_port: number;
  gateway_endpoint: string;
}

export interface StoreSummaryResponse {
  store: StoreRecord;
  layer_2: Layer2Details;
}

export interface DeviceLogRecord {
  id?: number;
  store_id?: number;
  device_id: string;
  firmware: string;
  battery: number;
  voltage: number;
  rssi: number;
  report_index: 'opening' | 'middle' | 'closing';
  report_type: 'scheduled' | 'alert' | 'handshake';
  status_code: 0 | 101 | 102 | 103 | 104 | 105;
  soc_temp: number;
  logged_at: string;
}

export interface CompanyUser {
  id: number;
  name: string;
  surname: string;
  avatar: string | null;
  email: string;
  role: string;
  country: string;
  city: string;
  workplace: string;
}

export interface SupermarketUser {
  id: number;
  name: string;
  surname: string;
  avatar: string | null;
  email: string;
  role: string;
  country: string;
  city: string;
  workplace: string;
}

export type NotificationCategory = 'store' | 'report' | 'user' | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';
export type NotificationEventType =
  | 'store_offline'
  | 'low_battery'
  | 'firmware_update_fail'
  | 'new_user_added'
  | 'unauthorized_access';

export interface NotificationItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  timeKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  eventType: NotificationEventType;
  entityId: string;
  isRead: boolean;
  requiresAck: boolean;
  acknowledgedAt: string | null;
  silencedAt: string | null;
  href: string;
}

export interface StoreWorkflowPayload {
  country: string;
  city: string;
  storeName: string;
  isBranch: boolean;
  branchName: string;
  address: string;
  allDayOpen: boolean;
  openingHour: string;
  closingHour: string;
  ownerName: string;
  ownerSurname: string;
}

export interface InstallationDraftResponse extends StoreWorkflowPayload {
  id: string;
  masterTokenSet: boolean;
  espTokenSet: boolean;
  connectionOk: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CompleteInstallationResult {
  draftId: string;
  storeId: number;
  status: string;
  location: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  unread_count?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface DeviceLogsQueryArgs {
  storeId: string | number;
  date: string;
  packetIndex: string;
  batteryStatus: string;
  statusCode: string;
  reportType: string;
  criticalOnly: boolean;
  page: number;
  limit: number;
}

export interface StoreConfigurationResponse {
  store: StoreWorkflowPayload;
  devices: Device[];
}

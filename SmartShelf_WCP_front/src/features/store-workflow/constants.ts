import type { DeviceFontSettings, DeviceLifecycleStatus, DeviceReportType } from './types';

export const COUNTRY_OPTIONS = ['Germany', 'France', 'UK'] as const;

export const CITY_OPTIONS_BY_COUNTRY: Record<string, string[]> = {
  Germany: ['Berlin', 'Munich'],
  France: ['Paris'],
  UK: ['London'],
};

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const hour = index.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const FONT_OPTIONS = Array.from({ length: 36 }, (_, index) => `${index + 5}px`);

export const DEVICE_STATUS_OPTIONS: DeviceLifecycleStatus[] = [
  'pending',
  'paired',
  'active',
  'offline',
  'unhealthy',
  'revoked',
  'decommissioned',
];

export const DEVICE_REPORT_TYPE_OPTIONS: DeviceReportType[] = ['scheduled', 'alert', 'handshake'];

export const DEVICE_STATUS_CODE_OPTIONS = [0, 101, 102, 103, 104, 105] as const;

export const DEFAULT_GATEWAY_CONFIG = {
  ip: '192.168.1.50',
  port: '8080',
  endpoint: '/api/v1/ingest',
} as const;

export const DEFAULT_FONT_SETTINGS: DeviceFontSettings = {
  productName: '12px',
  priceBefore: '12px',
  priceAfter: '12px',
  barcode: '12px',
  barcodeNumbers: '12px',
};

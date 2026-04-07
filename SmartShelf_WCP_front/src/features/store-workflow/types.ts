export interface DeviceFontSettings {
  productName: string;
  priceBefore: string;
  priceAfter: string;
  barcode: string;
  barcodeNumbers: string;
}

export type DeviceLifecycleStatus =
  | 'pending'
  | 'paired'
  | 'active'
  | 'offline'
  | 'unhealthy'
  | 'revoked'
  | 'decommissioned';

export type DeviceReportType = 'scheduled' | 'alert' | 'handshake';

export interface Device {
  id: number;
  country: string;
  city: string;
  storeName: string;
  branchName: string;
  espToken: string;
  screenSize: string;
  allDayWork: boolean;
  awakeTime: string;
  sleepTime: string;
  gatewayIp: string;
  gatewayPort: string;
  gatewayEndpoint: string;
  wifiSsid: string;
  wifiPassword: string;
  fontSettings: DeviceFontSettings;
  status: DeviceLifecycleStatus;
  statusCode: number;
  lastReportType: DeviceReportType;
  socTemp: number;
}

export interface BaseStoreWorkflowFormData {
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

export interface InstallationFormData extends BaseStoreWorkflowFormData {
  masterToken: string;
  espToken: string;
}

export type EditStoreFormData = BaseStoreWorkflowFormData;

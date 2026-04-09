import { DEFAULT_FONT_SETTINGS, DEFAULT_GATEWAY_CONFIG } from './constants';
import type {
  Device,
  DeviceFontSettings,
  EditStoreFormData,
  InstallationFormData,
} from './types';

const cloneFontSettings = (): DeviceFontSettings => ({ ...DEFAULT_FONT_SETTINGS });

export const getNextAvailableDeviceId = (devices: Array<Pick<Device, 'id'>>): number => {
  const ids = devices.map((device) => device.id).sort((left, right) => left - right);
  let nextId = 1;

  for (const id of ids) {
    if (id !== nextId) {
      break;
    }

    nextId += 1;
  }

  return nextId;
};

export const createDraftDevice = ({
  devices,
  country,
  city,
  storeName,
  branchName,
  espToken,
}: {
  devices: Array<Pick<Device, 'id'>>;
  country: string;
  city: string;
  storeName: string;
  branchName: string;
  espToken: string;
}): Device => ({
  id: getNextAvailableDeviceId(devices),
  country,
  city,
  storeName,
  branchName,
  espToken,
  screenSize: '',
  allDayWork: false,
  awakeTime: '09:00',
  sleepTime: '21:00',
  gatewayIp: DEFAULT_GATEWAY_CONFIG.ip,
  gatewayPort: DEFAULT_GATEWAY_CONFIG.port,
  gatewayEndpoint: DEFAULT_GATEWAY_CONFIG.endpoint,
  wifiSsid: '',
  wifiPassword: '',
  fontSettings: cloneFontSettings(),
  status: 'pending',
  statusCode: 0,
  lastReportType: 'handshake',
  socTemp: 24.5,
});

export const createInstallationFormData = (): InstallationFormData => ({
  country: '',
  city: '',
  storeName: '',
  isBranch: false,
  branchName: '',
  address: '',
  allDayOpen: false,
  openingHour: '',
  closingHour: '',
  ownerName: '',
  ownerSurname: '',
  masterToken: '',
  espToken: '',
});

export const createEditStoreFormData = (): EditStoreFormData => ({
  country: '',
  city: '',
  storeName: '',
  isBranch: false,
  branchName: '',
  address: '',
  allDayOpen: false,
  openingHour: '',
  closingHour: '',
  ownerName: '',
  ownerSurname: '',
});

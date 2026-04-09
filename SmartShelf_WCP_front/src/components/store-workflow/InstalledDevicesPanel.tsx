'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Edit2, MapPin, PlusCircle, Server, Trash2, Wifi } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DEVICE_STATUS_META } from '@/features/store-workflow/constants';
import type { Device } from '@/features/store-workflow/types';

interface InstalledDevicesPanelProps {
  devices: Device[];
  isDeviceFormVisible: boolean;
  onAddDevice: () => void;
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (deviceId: number) => void;
}

export function InstalledDevicesPanel({
  devices,
  isDeviceFormVisible,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
}: InstalledDevicesPanelProps) {
  const { t } = useTranslation();
  const deviceListRef = useRef<HTMLDivElement>(null);
  const visibleDevices = useMemo(() => [...devices].sort((left, right) => right.id - left.id), [devices]);

  useEffect(() => {
    if (deviceListRef.current) {
      deviceListRef.current.scrollTop = 0;
    }
  }, [devices]);

  return (
    <div className="space-y-4">
      <h3 className="text-left text-xl font-bold">{t('installed_devices')}</h3>

      {devices.length > 0 ? (
        <div ref={deviceListRef} className="flex max-h-[23rem] flex-col gap-4 overflow-y-auto pr-2 text-left">
          {visibleDevices.map((device) => (
            <div key={device.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-text-primary">ID: {device.id}</span>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', DEVICE_STATUS_META[device.status])}>
                    {t(device.status)}
                  </span>
                  <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
                    {device.screenSize || t('not_available')}
                  </span>
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => onEditDevice(device)}
                    className="cursor-pointer text-blue-500 transition-colors hover:text-blue-600"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDevice(device.id)}
                    className="cursor-pointer text-red-500 transition-colors hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-text-muted">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{device.branchName ? `${device.storeName} / ${device.branchName}` : device.storeName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi size={16} />
                  <span>{device.wifiSsid || t('no_ssid')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{device.allDayWork ? t('twenty_four_hours') : `${device.awakeTime || '09:00'} - ${device.sleepTime || '21:00'}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server size={16} />
                  <span>{device.gatewayIp}:{device.gatewayPort}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {devices.length === 0 && !isDeviceFormVisible ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-text-muted">
          {t('no_devices_added_yet')}
        </div>
      ) : null}

      {!isDeviceFormVisible ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onAddDevice}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-bold text-white transition-all hover:bg-brand-primary/90"
          >
            <PlusCircle size={18} />
            {t('add_new_device')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

 'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Server,
  Bluetooth,
  Wifi,
  Clock,
  Edit2,
  Trash2,
  Save,
  PlusCircle
} from 'lucide-react';
import {
  useGetCitiesQuery,
  useGetCountriesQuery,
  useGetStoreConfigurationQuery,
  useReplaceStoreDevicesMutation,
  useUpdateStoreMutation,
} from '@/api/api';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import FormLoading from '@/components/loading/FormLoading';
import { cn } from '../utils/cn';
import { useAppSelector } from '../store/hooks';
import {
  DEVICE_STATUS_OPTIONS,
  FONT_OPTIONS,
  HOUR_OPTIONS,
} from '@/features/store-workflow/constants';
import {
  createEditStoreFormData,
  createDraftDevice,
} from '@/features/store-workflow/helpers';
import type { Device, DeviceLifecycleStatus, EditStoreFormData } from '@/features/store-workflow/types';

const deviceStatusMeta: Record<DeviceLifecycleStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  paired: 'bg-brand-primary/10 text-brand-primary',
  active: 'bg-success/10 text-success',
  offline: 'bg-danger/10 text-danger',
  unhealthy: 'bg-warning/15 text-warning',
  revoked: 'bg-danger text-white',
  decommissioned: 'bg-slate-200 text-slate-700',
};

export default function EditStoreWorkflow() {
  const params = useParams<{ storeId: string | string[] }>();
  const storeId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId;
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'Administrator';

  const [currentStep, setCurrentStep] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [isDeviceFormVisible, setIsDeviceFormVisible] = useState(false);
  const [formData, setFormData] = useState<EditStoreFormData>(createEditStoreFormData);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Partial<Device>>({});
  const deviceListRef = useRef<HTMLDivElement>(null);
  const visibleDevices = [...devices].sort((left, right) => right.id - left.id);
  const {
    data: configuration,
    isLoading: isConfigurationLoading,
    error: configurationError,
    refetch,
  } = useGetStoreConfigurationQuery(storeId ?? '', {
    skip: !storeId,
  });
  const { data: countries = [] } = useGetCountriesQuery();
  const { data: availableCities = [] } = useGetCitiesQuery(formData.country, {
    skip: !formData.country,
  });
  const [updateStore, { isLoading: isUpdatingStore }] = useUpdateStoreMutation();
  const [replaceStoreDevices, { isLoading: isSavingDevices }] = useReplaceStoreDevicesMutation();

  useEffect(() => {
    if (!configuration) {
      return;
    }
    setFormData(configuration.store);
    setDevices(configuration.devices);
  }, [configuration]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto-scroll devices list
  useEffect(() => {
    if (deviceListRef.current) {
      deviceListRef.current.scrollTop = 0;
    }
  }, [devices]);

  const steps = [
    { id: 1, title: t('store_information'), icon: MapPin },
    { id: 2, title: t('device_setup'), icon: Bluetooth },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      if (name === 'country') {
        newData.city = '';
      }
      
      return newData;
    });
    setIsDirty(true);
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else router.push('/stores/edit');
  };

  const handleSaveChanges = async () => {
    if (!storeId) {
      return;
    }
    await updateStore({ storeId, payload: formData }).unwrap();
    await replaceStoreDevices({ storeId, devices }).unwrap();
    setIsDirty(false);
    router.push('/stores/edit');
  };

  const handleAddNewDeviceClick = () => {
    setCurrentDevice(createDraftDevice({
      devices,
      country: formData.country,
      city: formData.city,
      storeName: formData.storeName,
      branchName: formData.branchName,
      espToken: 'shared_store_device_token',
    }));
    setIsDeviceFormVisible(true);
  };

  const handleSaveDevice = () => {
    if (!currentDevice.id) return;

    const updatedDevicesList = [...devices];
    const existingIndex = devices.findIndex(d => d.id === currentDevice.id);

    if (existingIndex >= 0) {
      updatedDevicesList[existingIndex] = currentDevice as Device;
    } else {
      updatedDevicesList.push(currentDevice as Device);
    }
    setDevices(updatedDevicesList);
    setIsDirty(true);
    setIsDeviceFormVisible(false);
    setCurrentDevice({});
  };

  const handleEditDevice = (device: Device) => {
    setCurrentDevice({ ...device });
    setIsDeviceFormVisible(true);
  };
  
  const handleCancelEdit = () => {
    setIsDeviceFormVisible(false);
    setCurrentDevice({});
  };

  const handleDeleteDevice = (id: number) => {
    setDevices(devices.filter(d => d.id !== id));
    if (currentDevice.id === id) {
        setIsDeviceFormVisible(false);
        setCurrentDevice({});
    }
    setIsDirty(true);
  };

  if (isConfigurationLoading) {
    return <FormLoading />;
  }

  if (configurationError) {
    return (
      <div className="p-4 sm:p-8">
        <QueryErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <span className="text-brand-primary font-bold tracking-wider uppercase text-sm">SmartShelf.IO</span>
        <h1 className="text-3xl font-bold text-text-primary">{t('edit_store_workflow')}</h1>
        <p className="text-text-muted text-lg">{formData.storeName}</p>
      </div>

      <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0"></div>
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                  isCompleted ? "bg-success border-success text-white" :
                  isActive ? "bg-brand-primary border-brand-primary text-white scale-110 shadow-lg shadow-brand-primary/20" :
                  "bg-surface border-border text-text-muted"
                )}>
                  {isCompleted ? <Check size={24} /> : <step.icon size={24} />}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isActive ? "text-brand-primary" : "text-text-muted"
                )}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-8 flex-1">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6">{t('store_information')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('country')}</label>
                  <select 
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none disabled:opacity-50"
                    >
                      <option value="">{t('all_countries')}</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>{t(country === 'UK' ? 'united_kingdom' : country.toLowerCase())}</option>
                      ))}
                    </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('city')}</label>
                  <select 
                    name="city"
                    disabled={!formData.country}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none disabled:opacity-50"
                    value={formData.city}
                    onChange={handleInputChange}
                  >
                    <option value="">{t('select_city')}</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>{t(city.toLowerCase())}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('store_name')}</label>
                  <input 
                    type="text" 
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary"
                    placeholder={t('store_name')}
                  />
                </div>
                <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-surface-muted transition-colors mt-6">
                  <input 
                    type="checkbox" 
                    name="isBranch"
                    checked={formData.isBranch}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="font-semibold">{t('is_branch')}</span>
                </label>
              </div>

              {formData.isBranch && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-semibold">{t('branch_name')}</label>
                  <input 
                    type="text" 
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary"
                    placeholder={t('branch_name')}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('store_address')}</label>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary min-h-[100px] resize-y"
                  placeholder={t('enter_full_address')}
                />
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-surface-muted transition-colors">
                  <input 
                    type="checkbox" 
                    name="allDayOpen"
                    checked={formData.allDayOpen}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="font-semibold">{t('all_day_open')}</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('opening_hour')}</label>
                    <input 
                      type="time" 
                      name="openingHour"
                      value={formData.openingHour}
                      onChange={handleInputChange}
                      disabled={formData.allDayOpen}
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t('closing_hour')}</label>
                    <input 
                      type="time" 
                      name="closingHour"
                      value={formData.closingHour}
                      onChange={handleInputChange}
                      disabled={formData.allDayOpen}
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('owner_name')}</label>
                  <input 
                    type="text" 
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('owner_surname')}</label>
                  <input 
                    type="text" 
                    name="ownerSurname"
                    value={formData.ownerSurname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-brand-primary/10 rounded-full inline-block">
                        <Bluetooth size={48} className="text-brand-primary" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold">{t('device_setup')}</h2>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-left">{t('installed_devices')}</h3>
                
                {devices.length > 0 && (
                  <div 
                    ref={deviceListRef}
                    className="flex max-h-[23rem] flex-col gap-4 overflow-y-auto pr-2 text-left"
                  >
                    {visibleDevices.map(device => (
                      <div key={device.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-slate-900">ID: {device.id}</span>
                            <span className={cn('px-3 py-1 text-xs font-bold rounded-full', deviceStatusMeta[device.status])}>
                              {t(device.status)}
                            </span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-500 text-xs font-bold rounded-full">
                              {device.screenSize || t('not_available')}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={() => handleEditDevice(device)} className="text-blue-500 hover:text-blue-600 transition-colors cursor-pointer">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDeleteDevice(device.id)} className="text-red-500 hover:text-red-600 transition-colors cursor-pointer">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-medium">
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
                )}
                
                {(devices.length === 0 && !isDeviceFormVisible) && (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-text-muted">
                    {t('no_devices_added_yet')}
                  </div>
                )}

                {!isDeviceFormVisible && (
                    <div className="flex justify-center mt-6">
                        <button
                        onClick={handleAddNewDeviceClick}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/90 transition-all cursor-pointer"
                        >
                        <PlusCircle size={18} />
                        {t('add_new_device')}
                        </button>
                    </div>
                )}

                {isDeviceFormVisible && (
                  <div className="bg-surface p-6 rounded-xl border border-border text-left space-y-6 mt-6 animate-in fade-in zoom-in-95">
                    <h3 className="text-xl font-bold">{devices.some(d => d.id === currentDevice.id) ? `${t('edit_device')} (ID: ${currentDevice.id})` : t('add_new_device')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('id')}</label>
                        <input type="text" value={currentDevice.id || ''} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('country')}</label>
                        <input type="text" value={currentDevice.country || ''} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('city')}</label>
                        <input type="text" value={currentDevice.city || ''} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('store_name')}</label>
                        <input type="text" value={currentDevice.storeName || ''} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('branch_name')}</label>
                        <input type="text" value={currentDevice.branchName || '-'} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('esp32_token')}</label>
                        <input type="text" value={currentDevice.espToken || ''} readOnly className="w-full px-4 py-2.5 rounded-lg bg-surface-muted border border-border outline-none opacity-60" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('device_status')}</label>
                        <select
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary"
                          value={currentDevice.status || 'pending'}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, status: e.target.value as DeviceLifecycleStatus })}
                        >
                          {DEVICE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{t(status)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('screen_size')}</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary"
                          value={currentDevice.screenSize || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, screenSize: e.target.value })}
                        >
                          <option value="">{t('select')}</option>
                          <option value="80cm">80cm</option>
                          <option value="110cm">110cm</option>
                          <option value="130cm">130cm</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input 
                          type="checkbox" 
                          id="allDayWork" 
                          className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary cursor-pointer" 
                          checked={currentDevice.allDayWork || false}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, allDayWork: e.target.checked })}
                        />
                        <label htmlFor="allDayWork" className="text-sm font-medium leading-none cursor-pointer">
                          {t('all_day_work')}
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('awake_time')}</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                          disabled={currentDevice.allDayWork}
                          value={currentDevice.awakeTime || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, awakeTime: e.target.value })}
                        >
                          <option value="">{t('select')}</option>
                          {HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>{hour}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('sleep_time')}</label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                          disabled={currentDevice.allDayWork}
                          value={currentDevice.sleepTime || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, sleepTime: e.target.value })}
                        >
                          <option value="">{t('select')}</option>
                          {HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>{hour}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('gateway_ip')}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                          value={currentDevice.gatewayIp || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, gatewayIp: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('gateway_port')}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                          value={currentDevice.gatewayPort || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, gatewayPort: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('gateway_endpoint')}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                          value={currentDevice.gatewayEndpoint || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, gatewayEndpoint: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('wifi_ssid')}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                          value={currentDevice.wifiSsid || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, wifiSsid: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted uppercase">{t('wifi_password')}</label>
                        <input 
                          type="password" 
                          className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                          value={currentDevice.wifiPassword || ''}
                          onChange={(e) => setCurrentDevice({ ...currentDevice, wifiPassword: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border space-y-4">
                      <h4 className="text-sm font-bold">{t('font_settings')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(currentDevice.fontSettings || {}).map(key => (
                          <div className="space-y-1.5" key={key}>
                            <label className="text-xs font-bold text-text-muted uppercase">{t(key)}</label>
                            <select 
                              className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary"
                              value={currentDevice.fontSettings?.[key as keyof typeof currentDevice.fontSettings] || '12px'}
                              onChange={(e) => setCurrentDevice({ ...currentDevice, fontSettings: { ...currentDevice.fontSettings!, [key]: e.target.value } })}
                            >
                              {FONT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-4 pt-6">
                       <button 
                        onClick={handleCancelEdit}
                        className="px-6 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-all cursor-pointer"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        onClick={handleSaveDevice}
                        className="px-6 py-2.5 bg-success text-white font-bold rounded-lg hover:bg-success/90 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Save size={18} />
                        {currentDevice.id && devices.some(d => d.id === currentDevice.id) ? t('save_changes') : t('add_new_device')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-surface-muted/50 border-t border-border flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-8 py-3 text-text-muted font-bold hover:text-text-primary transition-all flex items-center gap-2 cursor-pointer"
          >
            <ChevronLeft size={20} />
            {t('previous')}
          </button>
          
          {currentStep < 2 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{t('next')}</span>
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSaveChanges}
              disabled={isDeviceFormVisible || isUpdatingStore || isSavingDevices}
              className="flex items-center gap-2 px-8 py-3 bg-success text-white font-bold rounded-xl hover:bg-success/90 transition-all shadow-lg shadow-success/30 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              <span>{isUpdatingStore || isSavingDevices ? t('saving', 'Saving...') : t('save_all_changes')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

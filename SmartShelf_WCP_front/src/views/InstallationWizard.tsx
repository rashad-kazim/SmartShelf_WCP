 'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Check, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Copy, 
  Bluetooth, 
  Wifi,
  AlertCircle,
  Clock,
  MapPin,
  Server,
  ShieldCheck,
  Activity,
  PlusCircle,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import {
  useCheckDraftConnectionMutation,
  useCompleteInstallationMutation,
  useCreateInstallationDraftMutation,
  useGenerateEspTokenMutation,
  useGenerateMasterTokenMutation,
  useGetCitiesQuery,
  useGetCountriesQuery,
  useSaveDraftDevicesMutation,
  useUpdateInstallationDraftMutation,
} from '@/api/api';
import { cn } from '../utils/cn';
import { DEVICE_STATUS_OPTIONS, FONT_OPTIONS, HOUR_OPTIONS } from '@/features/store-workflow/constants';
import { createDraftDevice, createInstallationFormData } from '@/features/store-workflow/helpers';
import type { Device, DeviceLifecycleStatus, InstallationFormData } from '@/features/store-workflow/types';

const deviceStatusMeta: Record<DeviceLifecycleStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  paired: 'bg-brand-primary/10 text-brand-primary',
  active: 'bg-success/10 text-success',
  offline: 'bg-danger/10 text-danger',
  unhealthy: 'bg-warning/15 text-warning',
  revoked: 'bg-danger text-white',
  decommissioned: 'bg-slate-200 text-slate-700',
};

export default function InstallationWizard() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InstallationFormData>(createInstallationFormData);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Partial<Device>>({});
  const [isDeviceFormVisible, setIsDeviceFormVisible] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();
  const deviceListRef = useRef<HTMLDivElement>(null);
  const { data: countries = [] } = useGetCountriesQuery();
  const { data: availableCities = [] } = useGetCitiesQuery(formData.country, {
    skip: !formData.country,
  });
  const [createDraft, { isLoading: isCreatingDraft }] = useCreateInstallationDraftMutation();
  const [updateDraft, { isLoading: isUpdatingDraft }] = useUpdateInstallationDraftMutation();
  const [generateMasterToken, { isLoading: isGeneratingMasterToken }] = useGenerateMasterTokenMutation();
  const [generateEspToken, { isLoading: isGeneratingEspToken }] = useGenerateEspTokenMutation();
  const [checkDraftConnection, { isLoading: isCheckingConnection }] = useCheckDraftConnectionMutation();
  const [saveDraftDevices, { isLoading: isSavingDraftDevices }] = useSaveDraftDevicesMutation();
  const [completeInstallation, { isLoading: isCompletingInstallation }] = useCompleteInstallationMutation();

  const isGenerating = isGeneratingMasterToken || isGeneratingEspToken;
  const isPersistingDraft = isCreatingDraft || isUpdatingDraft;
  const isBusy =
    isGenerating ||
    isCheckingConnection ||
    isSavingDraftDevices ||
    isCompletingInstallation ||
    isPersistingDraft;

  const getDeviceStatusCount = (status: DeviceLifecycleStatus) =>
    devices.filter((device) => device.status === status).length;

  const visibleDevices = [...devices].sort((left, right) => right.id - left.id);

  useEffect(() => {
    if (deviceListRef.current) {
      deviceListRef.current.scrollTop = 0;
    }
  }, [devices]);

  const steps = [
    { id: 1, title: t('branch_name'), icon: MapPin },
    { id: 2, title: t('master_token'), icon: ShieldCheck },
    { id: 3, title: t('esp32_token'), icon: Wifi },
    { id: 4, title: t('device_setup'), icon: Bluetooth },
    { id: 5, title: t('final_review'), icon: Check },
  ];

  const buildDraftPayload = () => ({
    country: formData.country,
    city: formData.city,
    storeName: formData.storeName,
    isBranch: formData.isBranch,
    branchName: formData.branchName,
    address: formData.address,
    allDayOpen: formData.allDayOpen,
    openingHour: formData.openingHour,
    closingHour: formData.closingHour,
    ownerName: formData.ownerName,
    ownerSurname: formData.ownerSurname,
  });

  const ensureDraft = async () => {
    const payload = buildDraftPayload();
    if (draftId) {
      const updatedDraft = await updateDraft({ draftId, payload }).unwrap();
      setDraftId(updatedDraft.id);
      return updatedDraft.id;
    }
    const createdDraft = await createDraft(payload).unwrap();
    setDraftId(createdDraft.id);
    return createdDraft.id;
  };

  const handleNext = async () => {
    setActionError(null);
    try {
      if (currentStep === 1) {
        await ensureDraft();
        setCurrentStep(2);
        return;
      }
      if (currentStep === 4) {
        const activeDraftId = await ensureDraft();
        await saveDraftDevices({ draftId: activeDraftId, devices }).unwrap();
        setCurrentStep(5);
        return;
      }
      if (currentStep === 5) {
        const activeDraftId = await ensureDraft();
        const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        const result = await completeInstallation({ draftId: activeDraftId, idempotencyKey }).unwrap();
        router.push(result.location);
        return;
      }
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('something_went_wrong', 'Something went wrong.');
      setActionError(message);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else router.push('/stores');
  };

  const generateToken = async (type: 'master' | 'esp') => {
    setActionError(null);
    try {
      const activeDraftId = await ensureDraft();
      const result = type === 'master'
        ? await generateMasterToken(activeDraftId).unwrap()
        : await generateEspToken(activeDraftId).unwrap();
      setFormData((prev) => ({
        ...prev,
        [type === 'master' ? 'masterToken' : 'espToken']: result.token,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('something_went_wrong', 'Something went wrong.');
      setActionError(message);
    }
  };

  const checkConnection = async () => {
    setActionError(null);
    setIsConnected(null);
    try {
      const activeDraftId = await ensureDraft();
      const result = await checkDraftConnection(activeDraftId).unwrap();
      setIsConnected(result.connected);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('something_went_wrong', 'Something went wrong.');
      setActionError(message);
      setIsConnected(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast logic here
  };

  const handleAddNewDeviceClick = () => {
    setCurrentDevice(createDraftDevice({
      devices,
      country: formData.country,
      city: formData.city,
      storeName: formData.storeName,
      branchName: formData.branchName,
      espToken: formData.espToken,
    }));
    setIsDeviceFormVisible(true);
  };
  
  const handleCancelEdit = () => {
    setIsDeviceFormVisible(false);
    setCurrentDevice({});
  };

  const handleSaveDevice = () => {
    if (!currentDevice.id) return;

    let updatedDevicesList = [...devices];
    const existingIndex = devices.findIndex(d => d.id === currentDevice.id);

    if (existingIndex >= 0) {
      updatedDevicesList[existingIndex] = currentDevice as Device;
    } else {
      updatedDevicesList.push(currentDevice as Device);
    }
    setDevices(updatedDevicesList);
    setIsDeviceFormVisible(false);
    setCurrentDevice({});
  };

  const handleEditDevice = (device: Device) => {
    setCurrentDevice({ ...device });
    setIsDeviceFormVisible(true);
  };

  const handleDeleteDevice = (id: number) => {
    setDevices(devices.filter(d => d.id !== id));
    if (currentDevice.id === id) {
        setIsDeviceFormVisible(false);
        setCurrentDevice({});
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        
        <h1 className="text-3xl font-bold text-text-primary">{t('new_installation')}</h1>
      </div>

      {/* Progress Bar */}
      <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center justify-between relative">
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
                  "text-xs font-bold uppercase tracking-wider hidden md:block",
                  isActive ? "text-brand-primary" : "text-text-muted"
                )}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
        {/* Mobile Progress Summary */}
        <div className="md:hidden text-center mt-4 text-sm font-bold text-brand-primary">
          {t('step')} {currentStep}/5: {steps[currentStep - 1].title}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface rounded-3xl border border-border shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-8 flex-1">
          {actionError ? (
            <div className="mb-6 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {actionError}
            </div>
          ) : null}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold">{t('branch_name')}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('country')}</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value, city: '' })}
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
                    disabled={!formData.country}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none disabled:opacity-50"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  >
                    <option value="">{t('select_city')}</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>{t(city.toLowerCase())}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('store_name')}</label>
                  <input 
                    type="text"
                    placeholder={t('eg_berlin_central')}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4 h-full pt-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-border text-brand-primary focus:ring-brand-primary"
                      checked={formData.isBranch}
                      onChange={(e) => setFormData({ ...formData, isBranch: e.target.checked })}
                    />
                    <span className="font-semibold">{t('is_branch')}</span>
                  </label>
                </div>

                {formData.isBranch && (
                  <div className="space-y-2 animate-in fade-in zoom-in-95">
                    <label className="text-sm font-semibold">{t('branch_name')}</label>
                    <input 
                      type="text"
                      required
                      placeholder={t('eg_alexanderplatz')}
                      className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    />
                  </div>
                )}

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">{t('store_address')}</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none"
                    placeholder={t('enter_full_address')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-4 py-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-border text-brand-primary focus:ring-brand-primary"
                      checked={formData.allDayOpen}
                      onChange={(e) => setFormData({ ...formData, allDayOpen: e.target.checked })}
                    />
                    <span className="font-semibold flex items-center gap-2">
                      <Clock size={18} className="text-brand-primary" />
                      {t('all_day_open')}
                    </span>
                  </label>
                </div>

                {!formData.allDayOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('opening_hour')}</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                        value={formData.openingHour}
                        onChange={(e) => setFormData({ ...formData, openingHour: e.target.value })}
                      >
                        <option value="">{t('select_hour')}</option>
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('closing_hour')}</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                        value={formData.closingHour}
                        onChange={(e) => setFormData({ ...formData, closingHour: e.target.value })}
                      >
                        <option value="">{t('select_hour')}</option>
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('owner_name')}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('owner_surname')}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.ownerSurname}
                    onChange={(e) => setFormData({ ...formData, ownerSurname: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto text-center">
              <div className="p-4 bg-brand-primary/10 rounded-full">
                <ShieldCheck size={48} className="text-brand-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">{t('master_token')}</h2>
              </div>

              <div className="w-full space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={() => generateToken('master')}
                    disabled={isGenerating || isPersistingDraft}
                    className="px-6 py-4 bg-brand-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={20} className={cn(isGenerating && "animate-spin")} />
                    {t('generate_token')}
                  </button>
                  <div className="flex-1 relative group">
                    <input
                      type="text"
                      readOnly
                      placeholder={t('token_will_appear_here')}
                      className="w-full px-6 py-4 rounded-xl bg-surface-muted border border-border font-mono text-sm focus:outline-none cursor-pointer group-hover:border-brand-primary transition-all"
                      value={formData.masterToken}
                      onClick={() => formData.masterToken && copyToClipboard(formData.masterToken)}
                    />
                    {formData.masterToken && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary opacity-0 group-hover:opacity-100 transition-all">
                        <Copy size={18} />
                      </div>
                    )}
                  </div>
                </div>

                  <button
                    onClick={checkConnection}
                    disabled={!formData.masterToken || isCheckingConnection || isPersistingDraft}
                    className={cn(
                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 cursor-pointer",
                    isConnected === true ? "bg-success/10 border-success text-success" :
                    isConnected === false ? "bg-danger/10 border-danger text-danger" :
                    "bg-surface-muted border-border text-text-muted hover:border-brand-primary disabled:opacity-50"
                  )}
                >
                  {isConnected === true ? (
                    <>
                      <Check size={20} />
                      {t('connected_layer2')}
                    </>
                  ) : (
                    <>
                      <Activity size={20} className={cn(isConnected === null && formData.masterToken && "animate-pulse")} />
                      {t('check_connection')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto text-center">
              <div className="p-4 bg-brand-primary/10 rounded-full">
                <Wifi size={48} className="text-brand-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">{t('esp32_token')}</h2>
              </div>

              <div className="w-full space-y-6">
                <div className="relative group">
                  <input
                    type="text"
                    readOnly
                    placeholder={t('token_will_appear_here')}
                    className="w-full px-8 py-6 rounded-2xl bg-surface-muted border border-border font-mono text-xl text-center focus:outline-none cursor-pointer group-hover:border-brand-primary transition-all"
                    value={formData.espToken}
                    onClick={() => formData.espToken && copyToClipboard(formData.espToken)}
                  />
                  {formData.espToken && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-primary opacity-0 group-hover:opacity-100 transition-all">
                      <Copy size={24} />
                    </div>
                  )}
                </div>

                  <button
                    onClick={() => generateToken('esp')}
                    disabled={isGenerating || isPersistingDraft}
                    className="w-full py-5 bg-brand-primary text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
                  >
                  <RefreshCw size={24} className={cn(isGenerating && "animate-spin")} />
                  {t('generate_esp32_token')}
                </button>
              </div>
            </div>
          )}

        {currentStep === 4 && (
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
                            {devices.some(d => d.id === currentDevice.id) ? t('save_changes') : t('add_new_device')}
                        </button>
                        </div>
                    </div>
                    )}
                </div>
                </div>
            )}

          {currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold">{t('review_final_report')}</h2>
                <p className="text-text-muted">{t('verify_installation')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-muted/30 p-8 rounded-3xl border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{t('master_token')}</h3>
                    <span className="px-4 py-1.5 bg-success/15 text-success rounded-full text-sm font-bold">{t('online')}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('master_token')}:</span>
                      <span className="font-bold font-mono">{formData.masterToken ? t('ready') : t('missing')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('shared_device_token')}:</span>
                      <span className="font-bold font-mono">{formData.espToken ? t('ready') : t('missing')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('heartbeat_received')}:</span>
                      <span className="font-bold">{t('yes')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">{t('last_seen')}:</span>
                      <span className="font-bold">{t('just_now')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-muted/30 p-8 rounded-3xl border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{t('devices')}</h3>
                    <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-brand-primary/10 text-brand-primary">
                        {devices.length} {t('configured')}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {t('total_devices_configured')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEVICE_STATUS_OPTIONS.map((status) => {
                      const count = getDeviceStatusCount(status);
                      return (
                        <span
                          key={status}
                          className={cn('rounded-full px-3 py-1 text-xs font-bold', deviceStatusMeta[status])}
                        >
                          {count} {t(status)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-warning/10 border border-warning/20 rounded-2xl flex gap-4 items-start">
                <AlertCircle className="text-warning shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-warning">{t('final_check_required')}</h4>
                  <p className="text-sm text-warning/80">
                    {t('final_check_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-surface-muted/50 border-t border-border flex items-center justify-between">
          <button
            onClick={handleBack}
            className="px-8 py-3 text-text-muted font-bold hover:text-text-primary transition-all flex items-center gap-2 cursor-pointer"
          >
            <ChevronLeft size={20} />
            {currentStep === 1 ? t('cancel') : t('previous')}
          </button>
          <button
            onClick={handleNext}
            disabled={
              isBusy ||
              (currentStep === 2 && !formData.masterToken) ||
              (currentStep === 3 && !formData.espToken) ||
              (currentStep === 4 && isDeviceFormVisible)
            }
            className="px-10 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
          >
            {isBusy ? t('loading') : currentStep === 5 ? t('complete_installation') : t('next')}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

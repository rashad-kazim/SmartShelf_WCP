 'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Save,
  LoaderCircle
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
import { InstalledDevicesPanel } from '@/components/store-workflow/InstalledDevicesPanel';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { translateCity, translateCountry } from '@/i18n/ui';
import { getApiErrorMessage } from '@/utils/api-error';
import { requiredLabel, requiredMessage } from '@/utils/form-fields';
import { cn } from '../utils/cn';
import { DEVICE_STATUS_META, DEVICE_STATUS_OPTIONS, FONT_OPTIONS, HOUR_OPTIONS } from '@/features/store-workflow/constants';
import { createDraftDevice, createInstallationFormData } from '@/features/store-workflow/helpers';
import type { Device, InstallationFormData } from '@/features/store-workflow/types';

export default function InstallationWizard() {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InstallationFormData>(createInstallationFormData);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Partial<Device>>({});
  const [isDeviceFormVisible, setIsDeviceFormVisible] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const currentLanguage = (i18n.resolvedLanguage ?? 'en').toLowerCase();
  const { data: countries = [] } = useGetCountriesQuery({ source: 'all' });
  const { data: availableCities = [], isFetching: isCitiesLoading } = useGetCitiesQuery({ country: formData.country, source: 'all' }, {
    skip: !formData.country,
  });
  const countryOptions = useMemo(
    () => countries.map((country) => ({
      value: country.name,
      label: translateCountry(t, country.name, currentLanguage),
      keywords: [country.name, country.code],
    })),
    [countries, t, currentLanguage],
  );
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

  const validateStoreStep = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.country.trim()) nextErrors.country = requiredMessage(t('country'));
    if (!formData.city.trim()) nextErrors.city = requiredMessage(t('city'));
    if (!formData.storeName.trim()) nextErrors.storeName = requiredMessage(t('store_name'));
    if (formData.isBranch && !formData.branchName.trim()) nextErrors.branchName = requiredMessage(t('branch_name'));
    if (!formData.address.trim()) nextErrors.address = requiredMessage(t('store_address'));
    if (!formData.allDayOpen && !formData.openingHour.trim()) nextErrors.openingHour = requiredMessage(t('opening_hour'));
    if (!formData.allDayOpen && !formData.closingHour.trim()) nextErrors.closingHour = requiredMessage(t('closing_hour'));
    if (!formData.ownerName.trim()) nextErrors.ownerName = requiredMessage(t('owner_name'));
    if (!formData.ownerSurname.trim()) nextErrors.ownerSurname = requiredMessage(t('owner_surname'));
    setStepErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateCurrentDevice = () => {
    const nextErrors: Record<string, string> = {};
    if (!currentDevice.screenSize?.trim()) nextErrors.screenSize = requiredMessage(t('screen_size'));
    if (!currentDevice.allDayWork && !currentDevice.awakeTime?.trim()) nextErrors.awakeTime = requiredMessage(t('awake_time'));
    if (!currentDevice.allDayWork && !currentDevice.sleepTime?.trim()) nextErrors.sleepTime = requiredMessage(t('sleep_time'));
    if (!currentDevice.gatewayIp?.trim()) nextErrors.gatewayIp = requiredMessage(t('gateway_ip'));
    if (!currentDevice.gatewayPort?.trim()) nextErrors.gatewayPort = requiredMessage(t('gateway_port'));
    if (!currentDevice.gatewayEndpoint?.trim()) nextErrors.gatewayEndpoint = requiredMessage(t('gateway_endpoint'));
    if (!currentDevice.wifiSsid?.trim()) nextErrors.wifiSsid = requiredMessage(t('wifi_ssid'));
    if (!currentDevice.wifiPassword?.trim()) nextErrors.wifiPassword = requiredMessage(t('wifi_password'));
    setDeviceErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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
        if (!validateStoreStep()) {
          return;
        }
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
      const message = getApiErrorMessage(error, t('something_went_wrong', 'Something went wrong.'), t);
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
      const message = getApiErrorMessage(error, t('something_went_wrong', 'Something went wrong.'), t);
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
      const message = getApiErrorMessage(error, t('something_went_wrong', 'Something went wrong.'), t);
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
    setDeviceErrors({});
  };
  
  const handleCancelEdit = () => {
    setIsDeviceFormVisible(false);
    setCurrentDevice({});
    setDeviceErrors({});
  };

  const handleSaveDevice = () => {
    if (!currentDevice.id || !validateCurrentDevice()) return;

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
    setDeviceErrors({});
  };

  const handleEditDevice = (device: Device) => {
    setCurrentDevice({ ...device });
    setIsDeviceFormVisible(true);
    setDeviceErrors({});
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
                  <label className="text-sm font-semibold">{requiredLabel(t('country'))}</label>
                  <SearchableSelect
                    value={formData.country}
                    options={countryOptions}
                    onValueChange={(value) => {
                      setFormData({ ...formData, country: value, city: '' });
                      setStepErrors((previous) => ({ ...previous, country: '', city: '' }));
                    }}
                    placeholder={t('select_country')}
                    emptyMessage={t('no_results_found')}
                    locale={currentLanguage}
                  />
                  {stepErrors.country ? <p className="text-sm text-danger">{stepErrors.country}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{requiredLabel(t('city'))}</label>
                  <SearchableSelect
                    value={formData.city}
                    options={availableCities}
                    onValueChange={(value) => {
                      setFormData({ ...formData, city: value });
                      setStepErrors((previous) => ({ ...previous, city: '' }));
                    }}
                    placeholder={t('select_city')}
                    renderOption={(city) => translateCity(t, city)}
                    emptyMessage={t('no_results_found')}
                    disabled={!formData.country}
                    locale={currentLanguage}
                    isLoading={isCitiesLoading}
                  />
                  {stepErrors.city ? <p className="text-sm text-danger">{stepErrors.city}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{requiredLabel(t('store_name'))}</label>
                  <input 
                    type="text"
                    placeholder={t('eg_berlin_central')}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.storeName}
                    onChange={(e) => {
                      setFormData({ ...formData, storeName: e.target.value });
                      setStepErrors((previous) => ({ ...previous, storeName: '' }));
                    }}
                  />
                  {stepErrors.storeName ? <p className="text-sm text-danger">{stepErrors.storeName}</p> : null}
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
                    <label className="text-sm font-semibold">{requiredLabel(t('branch_name'))}</label>
                    <input 
                      type="text"
                      placeholder={t('eg_alexanderplatz')}
                      className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                      value={formData.branchName}
                      onChange={(e) => {
                        setFormData({ ...formData, branchName: e.target.value });
                        setStepErrors((previous) => ({ ...previous, branchName: '' }));
                      }}
                    />
                    {stepErrors.branchName ? <p className="text-sm text-danger">{stepErrors.branchName}</p> : null}
                  </div>
                )}

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">{requiredLabel(t('store_address'))}</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none"
                    placeholder={t('enter_full_address')}
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      setStepErrors((previous) => ({ ...previous, address: '' }));
                    }}
                  />
                  {stepErrors.address ? <p className="text-sm text-danger">{stepErrors.address}</p> : null}
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
                      <label className="text-sm font-semibold">{requiredLabel(t('opening_hour'))}</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                        value={formData.openingHour}
                        onChange={(e) => {
                          setFormData({ ...formData, openingHour: e.target.value });
                          setStepErrors((previous) => ({ ...previous, openingHour: '' }));
                        }}
                      >
                        <option value="">{t('select_hour')}</option>
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      {stepErrors.openingHour ? <p className="text-sm text-danger">{stepErrors.openingHour}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{requiredLabel(t('closing_hour'))}</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                        value={formData.closingHour}
                        onChange={(e) => {
                          setFormData({ ...formData, closingHour: e.target.value });
                          setStepErrors((previous) => ({ ...previous, closingHour: '' }));
                        }}
                      >
                        <option value="">{t('select_hour')}</option>
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      {stepErrors.closingHour ? <p className="text-sm text-danger">{stepErrors.closingHour}</p> : null}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{requiredLabel(t('owner_name'))}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.ownerName}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerName: e.target.value });
                      setStepErrors((previous) => ({ ...previous, ownerName: '' }));
                    }}
                  />
                  {stepErrors.ownerName ? <p className="text-sm text-danger">{stepErrors.ownerName}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{requiredLabel(t('owner_surname'))}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    value={formData.ownerSurname}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerSurname: e.target.value });
                      setStepErrors((previous) => ({ ...previous, ownerSurname: '' }));
                    }}
                  />
                  {stepErrors.ownerSurname ? <p className="text-sm text-danger">{stepErrors.ownerSurname}</p> : null}
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

                <InstalledDevicesPanel
                    devices={devices}
                    isDeviceFormVisible={isDeviceFormVisible}
                    onAddDevice={handleAddNewDeviceClick}
                    onEditDevice={handleEditDevice}
                    onDeleteDevice={handleDeleteDevice}
                />

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
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('screen_size'))}</label>
                            <select 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary"
                            value={currentDevice.screenSize || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, screenSize: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, screenSize: '' }));
                            }}
                            >
                            <option value="">{t('select')}</option>
                            <option value="80cm">80cm</option>
                            <option value="110cm">110cm</option>
                            <option value="130cm">130cm</option>
                            </select>
                            {deviceErrors.screenSize ? <p className="text-sm text-danger normal-case">{deviceErrors.screenSize}</p> : null}
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
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('awake_time'))}</label>
                            <select 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                            disabled={currentDevice.allDayWork}
                            value={currentDevice.awakeTime || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, awakeTime: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, awakeTime: '' }));
                            }}
                            >
                            <option value="">{t('select')}</option>
                            {HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                            ))}
                            </select>
                            {deviceErrors.awakeTime ? <p className="text-sm text-danger normal-case">{deviceErrors.awakeTime}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('sleep_time'))}</label>
                            <select 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary disabled:opacity-50"
                            disabled={currentDevice.allDayWork}
                            value={currentDevice.sleepTime || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, sleepTime: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, sleepTime: '' }));
                            }}
                            >
                            <option value="">{t('select')}</option>
                            {HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                            ))}
                            </select>
                            {deviceErrors.sleepTime ? <p className="text-sm text-danger normal-case">{deviceErrors.sleepTime}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('gateway_ip'))}</label>
                            <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                            value={currentDevice.gatewayIp || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, gatewayIp: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, gatewayIp: '' }));
                            }}
                            />
                            {deviceErrors.gatewayIp ? <p className="text-sm text-danger normal-case">{deviceErrors.gatewayIp}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('gateway_port'))}</label>
                            <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                            value={currentDevice.gatewayPort || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, gatewayPort: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, gatewayPort: '' }));
                            }}
                            />
                            {deviceErrors.gatewayPort ? <p className="text-sm text-danger normal-case">{deviceErrors.gatewayPort}</p> : null}
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('gateway_endpoint'))}</label>
                            <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                            value={currentDevice.gatewayEndpoint || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, gatewayEndpoint: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, gatewayEndpoint: '' }));
                            }}
                            />
                            {deviceErrors.gatewayEndpoint ? <p className="text-sm text-danger normal-case">{deviceErrors.gatewayEndpoint}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('wifi_ssid'))}</label>
                            <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                            value={currentDevice.wifiSsid || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, wifiSsid: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, wifiSsid: '' }));
                            }}
                            />
                            {deviceErrors.wifiSsid ? <p className="text-sm text-danger normal-case">{deviceErrors.wifiSsid}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-muted uppercase">{requiredLabel(t('wifi_password'))}</label>
                            <input 
                            type="password" 
                            className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border outline-none focus:border-brand-primary" 
                            value={currentDevice.wifiPassword || ''}
                            onChange={(e) => {
                              setCurrentDevice({ ...currentDevice, wifiPassword: e.target.value });
                              setDeviceErrors((previous) => ({ ...previous, wifiPassword: '' }));
                            }}
                            />
                            {deviceErrors.wifiPassword ? <p className="text-sm text-danger normal-case">{deviceErrors.wifiPassword}</p> : null}
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
                          className={cn('rounded-full px-3 py-1 text-xs font-bold', DEVICE_STATUS_META[status])}
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
            {isBusy ? <LoaderCircle size={20} className="animate-spin" /> : null}
            <span>{isBusy ? t('loading') : currentStep === 5 ? t('complete_installation') : t('next')}</span>
            {!isBusy ? <ChevronRight size={20} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}

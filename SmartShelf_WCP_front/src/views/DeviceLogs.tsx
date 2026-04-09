'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useGetDeviceLogsQuery } from '@/api/api';
import { cn } from '../utils/cn';
import RingLoader from '@/components/loading/RingLoader';
import { translatePacketIndex } from '@/i18n/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeviceLogsProps {
  embedded?: boolean;
  storeId?: string | number;
}

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);
const REPORT_INDEX_OPENING = 'opening' as const;
const REPORT_INDEX_MIDDLE = 'middle' as const;
const REPORT_INDEX_CLOSING = 'closing' as const;

const getLatestPacketIndex = (date: string) => {
  if (date !== todayIso) {
    return REPORT_INDEX_CLOSING;
  }

  const currentHour = new Date().getHours();
  if (currentHour >= 16) {
    return REPORT_INDEX_CLOSING;
  }

  if (currentHour >= 12) {
    return REPORT_INDEX_MIDDLE;
  }

  return REPORT_INDEX_OPENING;
};

const statusCodeMeta = {
  0: { key: 'status_success', tone: 'bg-success/10 text-success' },
  101: { key: 'status_display_fail', tone: 'bg-danger/10 text-danger' },
  102: { key: 'status_wifi_disconnect', tone: 'bg-danger/10 text-danger' },
  103: { key: 'status_low_voltage', tone: 'bg-warning/15 text-warning' },
  104: { key: 'status_temp_high', tone: 'bg-warning/15 text-warning' },
  105: { key: 'status_auth_fail', tone: 'bg-danger text-white' },
} as const;

const reportTypeKeyMap = {
  scheduled: 'report_type_scheduled',
  alert: 'report_type_alert',
  handshake: 'report_type_handshake',
} as const;

const batteryLabelMap = {
  '75-100': 'battery_75_100',
  '50-75': 'battery_50_75',
  '25-50': 'battery_25_50',
  '<25': 'battery_below_25',
} as const;

const statusCodeOptions = [0, 101, 102, 103, 104, 105] as const;

const formatTemp = (value: number) => `${value.toFixed(1)} C`;

const DeviceLogs = ({ embedded = false, storeId: storeIdProp }: DeviceLogsProps) => {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string | string[] }>();
  const routeStoreId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId;
  const resolvedStoreId = storeIdProp ?? routeStoreId ?? '';
  const [filters, setFilters] = useState({
    date: todayIso,
    packetIndex: getLatestPacketIndex(todayIso),
    batteryStatus: 'all',
    criticalOnly: false,
    statusCode: 'all',
    reportType: 'all',
  });
  const [pagination, setPagination] = useState({ currentPage: 1, itemsPerPage: 20 });
  const { data, isLoading, isFetching } = useGetDeviceLogsQuery(
    {
      storeId: resolvedStoreId,
      date: filters.date,
      packetIndex: filters.packetIndex,
      batteryStatus: filters.batteryStatus,
      statusCode: filters.statusCode,
      reportType: filters.reportType,
      criticalOnly: filters.criticalOnly,
      page: pagination.currentPage,
      limit: pagination.itemsPerPage,
    },
    {
      skip: !resolvedStoreId,
      refetchOnMountOrArgChange: true,
    },
  );

  const logs = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / pagination.itemsPerPage));
  const isTableLoading = isLoading || isFetching;

  const handleFilterChange = (
    key: 'date' | 'packetIndex' | 'batteryStatus' | 'criticalOnly' | 'statusCode' | 'reportType',
    value: string | boolean,
  ) => {
    setPagination((previous) => ({ ...previous, currentPage: 1 }));
    setFilters((previous) => {
      const nextFilters = { ...previous, [key]: value };
      if (key === 'date') {
        nextFilters.packetIndex = getLatestPacketIndex(String(value));
      }
      return nextFilters;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      date: todayIso,
      packetIndex: getLatestPacketIndex(todayIso),
      batteryStatus: 'all',
      criticalOnly: false,
      statusCode: 'all',
      reportType: 'all',
    });
    setPagination((previous) => ({ ...previous, currentPage: 1 }));
  };

  const getBatteryIndicator = (percentage: number) => {
    let colorClass = 'bg-success';
    if (percentage < 25) colorClass = 'bg-destructive';
    else if (percentage < 50) colorClass = 'bg-warning';
    const textColor = percentage < 50 ? 'text-gray-800' : 'text-white';

    return (
      <div className="relative flex h-6 w-full items-center justify-center rounded-full bg-muted">
        <div className={cn('absolute left-0 top-0 h-6 rounded-full', colorClass)} style={{ width: `${percentage}%` }} />
        <span className={cn('relative z-10 text-xs font-bold', textColor)}>{percentage}%</span>
      </div>
    );
  };

  const getRssiLabel = (rssi: number) => {
    if (rssi > -60) return <span className="font-bold text-success">{t('good')}</span>;
    if (rssi > -75) return <span className="font-bold text-warning">{t('normal')}</span>;
    return <span className="font-bold text-destructive">{t('low')}</span>;
  };

  const activeFilters = useMemo(() => {
    const list: Array<{ key: keyof typeof filters; label: string; resetValue: string | boolean }> = [];

    if (filters.date !== todayIso) {
      list.push({ key: 'date', label: `${t('date_label')}: ${filters.date}`, resetValue: todayIso });
    }
    if (filters.packetIndex !== getLatestPacketIndex(filters.date)) {
      list.push({
        key: 'packetIndex',
        label: `${t('packet_label')}: ${translatePacketIndex(t, filters.packetIndex)}`,
        resetValue: getLatestPacketIndex(filters.date),
      });
    }
    if (filters.batteryStatus !== 'all') {
      list.push({
        key: 'batteryStatus',
        label: `${t('battery_label')}: ${t(batteryLabelMap[filters.batteryStatus as keyof typeof batteryLabelMap])}`,
        resetValue: 'all',
      });
    }
    if (filters.criticalOnly) {
      list.push({ key: 'criticalOnly', label: t('critical_only'), resetValue: false });
    }
    if (filters.statusCode !== 'all') {
      list.push({
        key: 'statusCode',
        label: `${t('status_code')}: ${Number(filters.statusCode)}`,
        resetValue: 'all',
      });
    }
    if (filters.reportType !== 'all') {
      list.push({
        key: 'reportType',
        label: `${t('report_type')}: ${t(reportTypeKeyMap[filters.reportType as keyof typeof reportTypeKeyMap])}`,
        resetValue: 'all',
      });
    }

    return list;
  }, [filters, t]);

  const renderTable = () => (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface min-h-[450px]">
      <table className="min-w-[980px] w-full table-fixed text-sm" aria-busy={isTableLoading}>
        <colgroup>
          <col style={{ width: '16%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead className="border-b border-border">
          <tr>
            {[t('device_id'), t('firmware'), t('battery'), t('voltage'), t('soc_temp'), 'RSSI', t('status_code'), t('report_type')].map(
              (header) => (
                <th key={header} className="whitespace-nowrap p-4 text-left font-bold text-text-primary">
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {isTableLoading ? (
            <tr className="border-b border-border last:border-0">
              <td colSpan={8} className="h-[392px] p-0 align-middle">
                <div className="relative flex h-[392px] w-full items-center justify-center overflow-hidden rounded-none bg-white/10 backdrop-blur-[28px]">
                  <span className="absolute inset-x-0 top-0 h-16 bg-white/18 blur-2xl dark:bg-white/5" />
                  <span className="absolute inset-x-8 bottom-0 h-14 rounded-full bg-black/5 blur-3xl dark:bg-black/10" />
                  <RingLoader size="sm" label={t('loading')} />
                </div>
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <tr className="border-b border-border last:border-0">
              <td colSpan={8} className="h-[392px] p-0 align-middle">
                <div className="flex h-[392px] w-full flex-col items-center justify-center rounded-none border-0 bg-background/70 text-center">
                  <FileText size={48} className="mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold">{t('no_logs_found')}</h3>
                  <p className="text-muted-foreground">{t('no_logs_found_desc')}</p>
                </div>
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={`${log.device_id}-${log.logged_at}-${log.report_index}-${log.report_type}`} className="border-b border-border last:border-0 hover:bg-background">
                <td className="p-4">
                  <span className="rounded bg-muted px-2 py-1 font-mono text-muted-foreground">{log.device_id}</span>
                </td>
                <td className="whitespace-nowrap p-4">{log.firmware}</td>
                <td className="min-w-[120px] p-4">{getBatteryIndicator(log.battery)}</td>
                <td className="p-4">{log.voltage}V</td>
                <td className="p-4">{formatTemp(log.soc_temp)}</td>
                <td className="p-4">{getRssiLabel(log.rssi)}</td>
                <td className="p-4">
                  <span className={cn('rounded-full px-2 py-1 text-xs font-bold', statusCodeMeta[log.status_code].tone)}>
                    {`${log.status_code} - ${t(statusCodeMeta[log.status_code].key)}`}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-primary">
                    {t(reportTypeKeyMap[log.report_type])}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const maxDate = todayIso;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const minDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const content = (
    <>
      <div className="mb-8 rounded-2xl border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            type="date"
            value={filters.date}
            min={minDate}
            max={maxDate}
            onChange={(event) => handleFilterChange('date', event.target.value)}
            className="input w-full cursor-pointer rounded-lg border-border bg-background p-2"
          />

          <select
            value={filters.packetIndex}
            onChange={(event) => handleFilterChange('packetIndex', event.target.value)}
            className="input w-full cursor-pointer rounded-lg border-border bg-background p-2"
          >
            <option value={REPORT_INDEX_OPENING}>{t('opening_logs')}</option>
            <option value={REPORT_INDEX_MIDDLE}>{t('middle_logs')}</option>
            <option value={REPORT_INDEX_CLOSING}>{t('closing_logs_latest')}</option>
          </select>

          <select
            value={filters.batteryStatus}
            onChange={(event) => handleFilterChange('batteryStatus', event.target.value)}
            className="input w-full cursor-pointer rounded-lg border-border bg-background p-2"
          >
            <option value="all">{t('all_battery')}</option>
            <option value="75-100">{t('battery_75_100')}</option>
            <option value="50-75">{t('battery_50_75')}</option>
            <option value="25-50">{t('battery_25_50')}</option>
            <option value="<25">{t('battery_below_25')}</option>
          </select>

          <select
            value={filters.statusCode}
            onChange={(event) => handleFilterChange('statusCode', event.target.value)}
            className="input w-full cursor-pointer rounded-lg border-border bg-background p-2"
          >
            <option value="all">{t('all_status_codes')}</option>
            {statusCodeOptions.map((statusCode) => (
              <option key={statusCode} value={statusCode}>
                {statusCode} - {t(statusCodeMeta[statusCode].key)}
              </option>
            ))}
          </select>

          <select
            value={filters.reportType}
            onChange={(event) => handleFilterChange('reportType', event.target.value)}
            className="input w-full cursor-pointer rounded-lg border-border bg-background p-2"
          >
            <option value="all">{t('all_report_types')}</option>
            <option value="scheduled">{t('report_type_scheduled')}</option>
            <option value="alert">{t('report_type_alert')}</option>
            <option value="handshake">{t('report_type_handshake')}</option>
          </select>

          <div className="flex flex-wrap items-center gap-3 md:justify-start xl:justify-between">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-primary">
              <input
                type="checkbox"
                checked={filters.criticalOnly}
                onChange={(event) => handleFilterChange('criticalOnly', event.target.checked)}
              />
              <span>{t('critical_only')}</span>
            </label>
            <button
              onClick={handleResetFilters}
              className="btn cursor-pointer rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300"
            >
              {t('reset')}
            </button>
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <div key={String(filter.key)} className="flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-sm">
                <span>{filter.label}</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange(filter.key, filter.resetValue)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {renderTable()}

      {data && data.meta.total > 0 ? (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('items_per_page')}</span>
            <select
              value={pagination.itemsPerPage}
              onChange={(event) => {
                setPagination({
                  ...pagination,
                  itemsPerPage: Number(event.target.value),
                  currentPage: 1,
                });
              }}
              className="input cursor-pointer rounded-lg border-border bg-background p-2"
            >
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
          </div>
          {!isTableLoading ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                disabled={pagination.currentPage === 1}
                className="btn btn-secondary rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {t('previous')}
              </button>
              <span className="text-muted-foreground">
                {t('page')} {pagination.currentPage} {t('of')} {totalPages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                disabled={pagination.currentPage === totalPages}
                className="btn btn-secondary rounded-lg px-4 py-2 disabled:opacity-50"
              >
                {t('next')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-4 sm:p-8">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>{t('device_logs')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">{content}</CardContent>
      </Card>
    </div>
  );
};

export default DeviceLogs;

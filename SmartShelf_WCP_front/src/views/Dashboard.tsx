'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, Building2, Cpu, Globe2, MapPinned } from 'lucide-react';
import DashboardLoading from '@/components/loading/DashboardLoading';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import { useGetActivityFeedQuery, useGetCitiesQuery, useGetCountriesQuery, useGetDashboardSummaryQuery } from '@/api/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { translateCity, translateCountry } from '@/i18n/ui';
import { cn } from '@/utils/cn';
import type { DashboardQueryArgs, DashboardTrendPoint } from '@/features/dashboard/types';

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const duration = 700;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

function BarChart({ points, colorClassName }: { points: DashboardTrendPoint[]; colorClassName: string }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: `repeat(${points.length || 1}, minmax(0, 1fr))` }}>
      {points.map((point) => (
        <div key={point.label} className="flex flex-col items-center gap-3">
          <div className="flex h-40 w-full items-end rounded-2xl bg-background px-2 py-3">
            <div
              className={cn('w-full rounded-xl transition-all duration-700', colorClassName)}
              style={{ height: `${Math.max(14, (point.value / maxValue) * 100)}%` }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-text-primary">{point.label}</p>
            <p className="text-xs text-text-muted">{point.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points }: { points: DashboardTrendPoint[] }) {
  const width = 420;
  const height = 180;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const polyline = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - (point.value / maxValue) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-border bg-background p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
          <defs>
            <linearGradient id="criticalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="rgb(239 68 68)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
          <polygon fill="url(#criticalGradient)" points={`0,${height} ${polyline} ${width},${height}`} />
          {points.map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * width;
            const y = height - (point.value / maxValue) * (height - 16) - 8;
            return <circle key={point.label} cx={x} cy={y} r="5" fill="rgb(239 68 68)" />;
          })}
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {points.map((point) => (
          <div key={point.label} className="rounded-2xl border border-border bg-background px-3 py-2 text-center">
            <p className="text-xs font-bold text-text-primary">{point.label}</p>
            <p className="text-xs text-text-muted">{point.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<DashboardQueryArgs>({
    range: '7d',
    country: 'all',
    city: 'all',
  });
  const currentLanguage = (i18n.resolvedLanguage ?? 'en').toLowerCase();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery(filters);
  const {
    data: activityFeed = [],
    isLoading: isActivityLoading,
    isFetching: isActivityFetching,
    error: activityError,
    refetch: refetchActivity,
  } = useGetActivityFeedQuery(filters);
  const { data: availableCountryOptions = [] } = useGetCountriesQuery({ source: 'stores' });
  const { data: availableCities = [] } = useGetCitiesQuery({ country: filters.country, source: 'stores' }, {
    skip: filters.country === 'all',
  });
  const availableCountries = [...availableCountryOptions].sort((left, right) =>
    translateCountry(t, left.name, currentLanguage).localeCompare(translateCountry(t, right.name, currentLanguage), currentLanguage),
  );
  const sortedCities = [...availableCities].sort((left, right) =>
    translateCity(t, left).localeCompare(translateCity(t, right), currentLanguage),
  );

  useEffect(() => {
    if (filters.country === 'all' && filters.city !== 'all') {
      setFilters((previous) => ({ ...previous, city: 'all' }));
      return;
    }

    if (filters.city !== 'all' && !availableCities.includes(filters.city)) {
      setFilters((previous) => ({ ...previous, city: 'all' }));
    }
  }, [availableCities, filters.city, filters.country]);

  const stats = useMemo(
    () => [
      {
        label: t('total_countries'),
        value: summary?.countriesCount ?? 0,
        icon: Globe2,
        color: 'text-brand-primary',
        bg: 'bg-brand-primary/10',
      },
      {
        label: t('total_cities'),
        value: summary?.citiesCount ?? 0,
        icon: MapPinned,
        color: 'text-success',
        bg: 'bg-success/10',
      },
      {
        label: t('total_esp32'),
        value: summary?.totalDevices ?? 0,
        icon: Cpu,
        color: 'text-warning',
        bg: 'bg-warning/15',
      },
      {
        label: t('critical_errors'),
        value: summary?.criticalErrors ?? 0,
        icon: AlertTriangle,
        color: 'text-danger',
        bg: 'bg-danger/10',
      },
    ],
    [summary, t],
  );

  if (isSummaryLoading || isActivityLoading) {
    return <DashboardLoading />;
  }

  if (summaryError || activityError) {
    return (
      <QueryErrorState
        onRetry={() => {
          void refetchSummary();
          void refetchActivity();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('overview')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('dashboard_summary_desc')}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
            <Building2 size={16} className="text-brand-primary" />
            <select
              value={filters.country}
              onChange={(event) => setFilters((previous) => ({ ...previous, country: event.target.value, city: 'all' }))}
              className="bg-transparent text-sm font-semibold text-text-primary outline-none"
            >
              <option value="all">{t('all_countries')}</option>
              {availableCountries.map((country) => (
                <option key={country.code || country.name} value={country.name}>
                  {translateCountry(t, country.name, currentLanguage)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
            <MapPinned size={16} className="text-success" />
            <select
              value={filters.city}
              onChange={(event) => setFilters((previous) => ({ ...previous, city: event.target.value }))}
              className="bg-transparent text-sm font-semibold text-text-primary outline-none"
            >
              <option value="all">{t('all_cities')}</option>
              {sortedCities.map((city) => (
                <option key={city} value={city}>
                  {translateCity(t, city)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-1">
            {(['7d', '30d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setFilters((previous) => ({ ...previous, range }))}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  filters.range === range
                    ? 'bg-brand-primary text-white'
                    : 'text-text-muted hover:bg-background hover:text-text-primary',
                )}
              >
                {range === '7d' ? t('last_7_days') : t('last_30_days')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Activity size={16} />
        <Badge variant="default" className="text-xs font-bold">
          {isSummaryFetching || isActivityFetching ? t('updating', 'Updating...') : t('real_time_updates')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn('rounded-2xl p-3', stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">{stat.label}</p>
                  <p className="text-3xl font-bold text-text-primary">
                    <AnimatedNumber value={stat.value} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {summary?.highlights.map((highlight) => (
          <Card key={highlight.id}>
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-text-muted">{t(highlight.titleKey)}</p>
              <p
                className={cn(
                  'mt-3 text-3xl font-bold',
                  highlight.tone === 'brand' && 'text-brand-primary',
                  highlight.tone === 'success' && 'text-success',
                  highlight.tone === 'warning' && 'text-warning',
                  highlight.tone === 'danger' && 'text-danger',
                )}
              >
                {highlight.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t('stores_added_chart')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <BarChart points={summary?.addedStoresTrend ?? []} colorClassName="bg-brand-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t('critical_errors_chart')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <LineChart points={summary?.criticalErrorsTrend ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-brand-primary" />
            <CardTitle className="text-base">{t('activity_feed')}</CardTitle>
          </div>
          <span className="text-xs font-mono text-text-muted">{t('last_60_mins')}</span>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {activityFeed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-text-primary">{t('no_activity_feed')}</p>
              <p className="mt-2 text-xs text-text-muted">{t('no_activity_feed_desc')}</p>
            </div>
          ) : (
            activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="mt-1 h-2 w-2 rounded-full bg-brand-primary" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{t(item.messageKey)}</p>
                    <span className="text-xs text-text-muted">{t(item.timeKey)}</span>
                  </div>
                  <p className="font-mono text-xs text-text-muted">{t(item.detailsKey)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type DashboardRange = '7d' | '30d';

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface DashboardHighlight {
  id: string;
  titleKey: string;
  value: string;
  tone: 'brand' | 'success' | 'warning' | 'danger';
}

export interface DashboardSummary {
  countriesCount: number;
  citiesCount: number;
  totalDevices: number;
  criticalErrors: number;
  pendingAckCount: number;
  storesAddedTotal: number;
  addedStoresTrend: DashboardTrendPoint[];
  criticalErrorsTrend: DashboardTrendPoint[];
  highlights: DashboardHighlight[];
  availableCountries: string[];
  availableCities: string[];
}

export interface DashboardQueryArgs {
  range: DashboardRange;
  country: string;
  city: string;
}

export interface ActivityFeedItem {
  id: string;
  messageKey: string;
  detailsKey: string;
  timeKey: string;
}

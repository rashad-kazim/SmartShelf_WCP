import { DEFAULT_STORE_FILTERS } from './constants';
import type { AppliedStoreFilter, StoreFiltersState } from './types';

export const buildAppliedFilters = (filters: StoreFiltersState): AppliedStoreFilter[] => {
  const appliedFilters: AppliedStoreFilter[] = [];

  if (filters.country !== DEFAULT_STORE_FILTERS.country) {
    appliedFilters.push({ key: 'country', label: filters.country });
  }

  if (filters.city !== DEFAULT_STORE_FILTERS.city) {
    appliedFilters.push({ key: 'city', label: filters.city });
  }

  if (filters.supermarket !== DEFAULT_STORE_FILTERS.supermarket) {
    appliedFilters.push({ key: 'supermarket', label: filters.supermarket });
  }

  return appliedFilters;
};

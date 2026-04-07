export interface StoreRecord {
  id: number;
  name: string;
  country: string;
  city: string;
  status: 'Active' | 'Inactive';
  devices: number;
}

export interface StoreFiltersState {
  country: string;
  city: string;
  supermarket: string;
}

export interface AppliedStoreFilter {
  key: keyof StoreFiltersState;
  label: string;
}

export type StorePageType = 'edit' | 'delete' | 'logs';

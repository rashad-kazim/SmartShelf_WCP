import type { TFunction } from 'i18next';

const COUNTRY_KEYS: Record<string, string> = {
  Germany: 'germany',
  France: 'france',
  UK: 'united_kingdom',
};

const CITY_KEYS: Record<string, string> = {
  Berlin: 'berlin',
  Munich: 'munich',
  Paris: 'paris',
  Lyon: 'lyon',
  London: 'london',
  Manchester: 'manchester',
};

const ROLE_KEYS: Record<string, string> = {
  'Store Manager': 'store_manager',
  Cashier: 'cashier',
  'Stock Keeper': 'stock_keeper',
  Administrator: 'administrator',
  Analyst: 'analyst',
  Engineer: 'engineer',
};

const WORKPLACE_KEYS: Record<string, string> = {
  Headquarters: 'headquarters',
  'Supermarket A': 'supermarket_a',
  'Supermarket B': 'supermarket_b',
  'Supermarket C': 'supermarket_c',
  'Supermarket D': 'supermarket_d',
  'Supermarket X': 'supermarket_x',
};

const PACKET_KEYS: Record<string, string> = {
  'Opening Logs': 'opening_logs',
  'Middle Logs': 'middle_logs',
  'Closing Logs': 'closing_logs',
};

const translateFromMap = (t: TFunction, value: string, keyMap: Record<string, string>) => {
  if (!value) {
    return value;
  }

  const translationKey = keyMap[value];
  return translationKey ? t(translationKey, value) : value;
};

export const translateCountry = (t: TFunction, country: string) =>
  translateFromMap(t, country, COUNTRY_KEYS);

export const translateCity = (t: TFunction, city: string) =>
  translateFromMap(t, city, CITY_KEYS);

export const translateRole = (t: TFunction, role: string) =>
  translateFromMap(t, role, ROLE_KEYS);

export const translateWorkplace = (t: TFunction, workplace: string) =>
  translateFromMap(t, workplace, WORKPLACE_KEYS);

export const translatePacketIndex = (t: TFunction, packetIndex: string) =>
  translateFromMap(t, packetIndex, PACKET_KEYS);

export const translateLocation = (t: TFunction, city: string, country: string) =>
  [translateCity(t, city), translateCountry(t, country)].filter(Boolean).join(', ');

export const translateFilterValue = (
  t: TFunction,
  key: 'country' | 'city' | 'supermarket',
  value: string,
) => {
  if (key === 'country') {
    return translateCountry(t, value);
  }

  if (key === 'city') {
    return translateCity(t, value);
  }

  return translateWorkplace(t, value);
};

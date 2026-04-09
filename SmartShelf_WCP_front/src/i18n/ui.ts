import type { TFunction } from 'i18next';
import i18n from './config';

const countryCodeRegistry = new Map<string, string>();

const LOCALE_MAP: Record<string, string> = {
  en: 'en',
  tr: 'tr',
  ru: 'ru',
  az: 'az',
  pl: 'pl',
};

const COUNTRY_KEYS: Record<string, string> = {
  Germany: 'germany',
  France: 'france',
  UK: 'united_kingdom',
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
  opening: 'opening_logs',
  middle: 'middle_logs',
  closing: 'closing_logs',
};

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'united kingdom': 'GB',
};

const normalizeCountryKey = (value: string) => value.trim().toLowerCase();

const resolveLocale = (locale?: string) => {
  const normalizedLocale = (locale ?? i18n.resolvedLanguage ?? i18n.language ?? 'en')
    .toLowerCase()
    .split('-')[0];
  return LOCALE_MAP[normalizedLocale] ?? normalizedLocale ?? 'en';
};

const translateFromMap = (t: TFunction, value: string, keyMap: Record<string, string>) => {
  if (!value) {
    return value;
  }

  const translationKey = keyMap[value];
  return translationKey ? t(translationKey, value) : value;
};

export const registerCountries = (countries: Array<{ code: string; name: string }>) => {
  countries.forEach((country) => {
    if (!country.code || !country.name) {
      return;
    }
    countryCodeRegistry.set(normalizeCountryKey(country.name), country.code.toUpperCase());
  });
};

export const translateCountry = (t: TFunction, country: string, locale?: string) => {
  if (!country) {
    return country;
  }

  const currentLanguage = resolveLocale(locale);
  const regionCode = countryCodeRegistry.get(normalizeCountryKey(country)) ?? COUNTRY_ALIASES[normalizeCountryKey(country)];
  if (regionCode && typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined') {
    const translatedCountry = new Intl.DisplayNames([currentLanguage], { type: 'region' }).of(regionCode);
    if (translatedCountry) {
      return translatedCountry;
    }
  }

  return translateFromMap(t, country, COUNTRY_KEYS);
};

export const translateCity = (_t: TFunction, city: string) => city;

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


import type { AuthCredentials } from './types';

export const AUTH_STORAGE_KEY = 'smartshelf-auth';

export type StoredAuthPayload = AuthCredentials;

export const loadStoredAuth = (): StoredAuthPayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredAuthPayload;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const saveStoredAuth = (payload: StoredAuthPayload) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
};

export const clearStoredAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

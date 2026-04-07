export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  scope?: {
    all_countries: boolean;
    countries: string[];
  };
  preferences: UserPreferences;
}

export interface AuthCredentials {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

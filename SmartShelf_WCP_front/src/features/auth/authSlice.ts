import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthCredentials, AuthUser, UserPreferences } from './types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const defaultPreferences: UserPreferences = {
  language: 'en',
  theme: 'light',
  sidebarCollapsed: false,
};

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
};

const ensurePreferences = (user: AuthUser): AuthUser => ({
  ...user,
  preferences: user.preferences ?? defaultPreferences,
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthCredentials>) => {
      state.user = ensurePreferences(action.payload.user);
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    syncAuthUser: (state, action: PayloadAction<AuthUser>) => {
      if (!state.user) {
        return;
      }
      state.user = ensurePreferences(action.payload);
    },
    updatePreferences: (state, action: PayloadAction<UserPreferences>) => {
      if (!state.user) {
        return;
      }
      state.user = {
        ...state.user,
        preferences: action.payload,
      };
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, syncAuthUser, updatePreferences, logout } = authSlice.actions;
export default authSlice.reducer;

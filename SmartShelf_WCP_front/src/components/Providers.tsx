'use client';

import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import '../i18n/config';
import { store } from '@/store/store';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return <Provider store={store}>{children}</Provider>;
}

 'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Firmware() {
  const { t } = useTranslation();

  return (
    <div className="p-8 bg-surface rounded-3xl border border-border">
      {t('firmware_management_module')}
    </div>
  );
}

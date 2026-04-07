import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface StoreDeviceLogsPageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreDeviceLogsPageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Store ${storeId} Device Logs`,
    description: 'Secilen magazanin cihaz loglarini ve gunluk telemetri filtrelerini goruntuleyin.',
    path: `/stores/${storeId}/logs/device-logs`,
    keywords: ['device logs', 'telemetry logs', 'esp32 logs'],
    noIndex: true,
  });
}

export { default } from '@/views/DeviceLogs';

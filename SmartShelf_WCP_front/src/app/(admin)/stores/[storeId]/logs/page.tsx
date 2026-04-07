import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface StoreLogsPageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreLogsPageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Store ${storeId} Logs`,
    description: 'Secilen magazaya ait Layer 2 detaylari veya cihaz loglari ekranina gidin.',
    path: `/stores/${storeId}/logs`,
    keywords: ['store logs', 'layer 2 details', 'device logs'],
    noIndex: true,
  });
}

export { default } from '@/views/StoreLogsHub';

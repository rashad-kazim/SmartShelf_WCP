import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface StoreLayer2PageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreLayer2PageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Store ${storeId} Layer 2 Details`,
    description: 'Secilen magazanin Layer 2 kimlik, surum ve heartbeat detaylarini goruntuleyin.',
    path: `/stores/${storeId}/logs/layer2`,
    keywords: ['layer 2 details', 'gateway health', 'heartbeat details'],
    noIndex: true,
  });
}

export { default } from '@/views/StoreLogsDetails';

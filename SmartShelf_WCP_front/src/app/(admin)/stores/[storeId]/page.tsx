import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface StoreDetailsPageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreDetailsPageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Store ${storeId} Details`,
    description: 'Magaza detaylarini, durumunu ve bagli cihaz ozetini inceleyin.',
    path: `/stores/${storeId}`,
    keywords: ['store details', 'magaza detayi'],
    noIndex: true,
  });
}

export { default } from '@/views/StoreDetails';

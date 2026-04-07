import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface StoreSummaryPageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StoreSummaryPageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Store ${storeId} Summary`,
    description: 'Magazaya ait ozet performans ve operasyon detaylarini goruntuleyin.',
    path: `/stores/${storeId}/summary`,
    keywords: ['store summary', 'operasyon ozeti'],
    noIndex: true,
  });
}

export { default } from '@/views/StoreSummary';

import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface SupermarketUserEditPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export async function generateMetadata({
  params,
}: SupermarketUserEditPageProps): Promise<Metadata> {
  const { userId } = await params;

  return createPageMetadata({
    title: `Edit Supermarket User ${userId}`,
    description: 'Supermarket kullanicisi detaylarini ve gorev alanlarini guncelleyin.',
    path: `/user/edit/${userId}`,
    keywords: ['supermarket user', 'edit user'],
    noIndex: true,
  });
}

export { default } from '@/views/UserForm';

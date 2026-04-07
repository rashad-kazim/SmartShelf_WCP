import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface CompanyUserEditPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CompanyUserEditPageProps): Promise<Metadata> {
  const { userId } = await params;

  return createPageMetadata({
    title: `Edit Company User ${userId}`,
    description: 'Sirket kullanicisi detaylarini ve rol atamalarini guncelleyin.',
    path: `/company-user/edit/${userId}`,
    keywords: ['company user', 'edit user'],
    noIndex: true,
  });
}

export { default } from '@/views/CompanyUserForm';

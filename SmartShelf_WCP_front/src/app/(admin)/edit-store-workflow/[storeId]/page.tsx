import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

interface EditStoreWorkflowPageProps {
  params: Promise<{
    storeId: string;
  }>;
}

export async function generateMetadata({
  params,
}: EditStoreWorkflowPageProps): Promise<Metadata> {
  const { storeId } = await params;

  return createPageMetadata({
    title: `Edit Store Workflow ${storeId}`,
    description: 'Secilen magaza icin kurulum ve duzenleme adimlarini tamamlayin.',
    path: `/edit-store-workflow/${storeId}`,
    keywords: ['edit store workflow', 'kurulum akisi'],
    noIndex: true,
  });
}

export { default } from '@/views/EditStoreWorkflow';

import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Stores & Branches',
  description: 'Magaza ve sube listesini operasyonel ozetlerle birlikte goruntuleyin.',
  path: '/stores',
  keywords: ['stores', 'branches', 'magaza listesi'],
});

export { default } from '@/views/StoresAndBranches';

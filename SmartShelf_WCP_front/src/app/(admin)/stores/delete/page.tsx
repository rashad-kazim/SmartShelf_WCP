import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Delete Store',
  description: 'Magaza silme akislarini kontrollu bir sekilde yonetin.',
  path: '/stores/delete',
  keywords: ['delete store', 'magaza sil'],
});

export { default } from '@/views/DeleteStore';

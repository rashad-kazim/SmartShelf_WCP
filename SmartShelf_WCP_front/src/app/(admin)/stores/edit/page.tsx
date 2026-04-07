import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Edit Store',
  description: 'Magaza bilgilerinde guncelleme yapmak icin duzenleme ekranini kullanin.',
  path: '/stores/edit',
  keywords: ['edit store', 'magaza duzenle'],
});

export { default } from '@/views/EditStore';

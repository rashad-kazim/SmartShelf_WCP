import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Add Supermarket User',
  description: 'Yeni supermarket kullanicisi ekleyin ve gorev atamasini tamamlayin.',
  path: '/user/add',
  keywords: ['supermarket user', 'kullanici ekle'],
  noIndex: true,
});

export { default } from '@/views/UserForm';

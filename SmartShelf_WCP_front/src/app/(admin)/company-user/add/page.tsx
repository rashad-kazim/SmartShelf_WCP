import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Add Company User',
  description: 'Yeni sirket kullanicisi ekleyin ve rol atamasini hizla tamamlayin.',
  path: '/company-user/add',
  keywords: ['company user', 'kullanici ekle'],
  noIndex: true,
});

export { default } from '@/views/CompanyUserForm';

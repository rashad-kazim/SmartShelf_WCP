import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Genel Bakis',
  description: 'Dashboard uzerinden magaza sagligini, cihaz durumlarini ve son operasyon hareketlerini izleyin.',
  path: '/',
  keywords: ['dashboard', 'genel bakis', 'operasyon paneli'],
});

export { default } from '@/views/Dashboard';

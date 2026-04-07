import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Supermarket Employees',
  description: 'Supermarket personelini, gorevlerini ve calisma lokasyonlarini yonetin.',
  path: '/supermarket-employees',
  keywords: ['supermarket employees', 'magaza personeli', 'rol yonetimi'],
});

export { default } from '@/views/SupermarketEmployees';

import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Company Employees',
  description: 'Sirket personelini, rollerini ve lokasyonlarini tek ekranda yonetin.',
  path: '/company-employees',
  keywords: ['company employees', 'rol yonetimi', 'personel yonetimi'],
});

export { default } from '@/views/CompanyEmployees';

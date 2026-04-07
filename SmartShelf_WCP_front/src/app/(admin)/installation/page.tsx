import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Installation',
  description: 'Kurulum akisini, cihaz eslestirmelerini ve operasyon adimlarini yonetin.',
  path: '/installation',
  keywords: ['installation', 'kurulum raporu', 'cihaz kurulum'],
});

export { default } from '@/views/InstallationWizard';

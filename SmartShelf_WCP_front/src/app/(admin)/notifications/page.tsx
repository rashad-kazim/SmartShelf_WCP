import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Notifications',
  description: 'Operasyon guncellemelerini, raporlari ve sistem bildirimlerini tek ekranda takip edin.',
  path: '/notifications',
  keywords: ['notifications', 'alerts', 'operasyon bildirimleri'],
});

export { default } from '@/views/NotificationsCenter';

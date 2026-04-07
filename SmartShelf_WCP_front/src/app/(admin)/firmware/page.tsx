import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Firmware',
  description: 'Firmware dagitim sureclerini ve ilgili operasyon adimlarini izleyin.',
  path: '/firmware',
  keywords: ['firmware', 'cihaz yonetimi'],
});

export { default } from '@/views/Firmware';

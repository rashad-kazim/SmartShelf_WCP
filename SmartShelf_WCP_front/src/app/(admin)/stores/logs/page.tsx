import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Store Logs',
  description: 'Magaza log kayitlarini ve son operasyon hareketlerini inceleyin.',
  path: '/stores/logs',
  keywords: ['store logs', 'cihaz loglari'],
});

export { default } from '@/views/ViewLogs';

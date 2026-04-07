import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Login',
  description: 'SmartShelf.ai yonetim paneline guvenli giris yapin.',
  path: '/login',
  keywords: ['login', 'yonetim paneli giris'],
});

export { default } from '@/views/Login';

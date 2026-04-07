import { createPageMetadata } from '@/app/seo';

export const metadata = createPageMetadata({
  title: 'Users & Roles',
  description: 'Kullanici tiplerini, rollerini ve yonetim akislarini tek merkezden yonetin.',
  path: '/users',
  keywords: ['users', 'roles', 'kullanici yonetimi'],
});

export { default } from '@/views/UsersAndRoles';

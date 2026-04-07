import type { Metadata } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000';

const defaultDescription =
  'SmartShelf.ai ile magaza sagligini izleyin, kurulum raporlarini goruntuleyin ve rol yonetimini hizli bir sekilde yonetin.';

const defaultKeywords = [
  'SmartShelf',
  'magaza sagligi',
  'kurulum raporlari',
  'rol yonetimi',
  'envanter',
  'supermarket operasyonlari',
];

export const siteConfig = {
  name: 'SmartShelf.ai',
  title: 'SmartShelf.ai',
  description: defaultDescription,
  url: siteUrl,
  ogImagePath: '/opengraph-image',
};

interface CreateMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
}

export const absoluteUrl = (path = '/') => new URL(path, siteConfig.url).toString();

export const createPageMetadata = ({
  title,
  description = defaultDescription,
  path = '/',
  keywords = [],
  noIndex = false,
}: CreateMetadataOptions): Metadata => {
  const fullTitle = title === siteConfig.title ? title : `${title} | ${siteConfig.name}`;
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(siteConfig.ogImagePath);

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      locale: 'tr_TR',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        },
  };
};

export const sitemapRoutes = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/login', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/stores', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/stores/edit', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/stores/delete', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/stores/logs', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/installation', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/firmware', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/users', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/notifications', priority: 0.7, changeFrequency: 'daily' as const },
  { path: '/company-employees', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/supermarket-employees', priority: 0.8, changeFrequency: 'weekly' as const },
];

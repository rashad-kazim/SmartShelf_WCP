import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../index.css';
import Providers from '@/components/Providers';
import { absoluteUrl, siteConfig } from './seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  description: siteConfig.description,
  keywords: ['SmartShelf', 'magaza sagligi', 'kurulum raporlari', 'rol yonetimi'],
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    siteName: siteConfig.name,
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: absoluteUrl(siteConfig.ogImagePath),
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImagePath)],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

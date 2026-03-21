import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { appConfig } from '@pawroute/config';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: appConfig.seo.defaultTitle,
    template: appConfig.seo.titleTemplate,
  },
  description: appConfig.seo.defaultDescription,
  keywords: [...appConfig.seo.keywords],
  openGraph: {
    title: appConfig.seo.defaultTitle,
    description: appConfig.seo.defaultDescription,
    url: appConfig.seo.canonicalUrl,
    siteName: appConfig.seo.siteName,
    images: [{ url: appConfig.seo.ogImage, width: 1200, height: 630, alt: appConfig.seo.ogImageAlt }],
    locale: appConfig.seo.locale,
    type: 'website',
  },
  twitter: {
    card: appConfig.seo.twitterCardType,
    title: appConfig.seo.defaultTitle,
    description: appConfig.seo.defaultDescription,
    site: appConfig.seo.twitterHandle,
    images: [appConfig.seo.ogImage],
  },
  manifest: '/manifest.json',
  applicationName: appConfig.product.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: appConfig.product.name,
  },
  icons: {
    icon: '/assets/logo-icon.png',
    apple: '/assets/logo-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: appConfig.pwa.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={appConfig.locale.defaultLanguage} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-white text-text-primary`}>
        {children}
      </body>
    </html>
  );
}

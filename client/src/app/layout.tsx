import React from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Yantramanav, Merriweather } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';

// Configure fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-merriweather',
  display: 'swap',
});

const yantramanav = Yantramanav({
  subsets: ['devanagari', 'latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-yantramanav',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Digital Jagran | Latest News in Hindi & English',
    template: '%s | Digital Jagran',
  },
  description: 'India\'s trusted bilingual news platform delivering comprehensive coverage in Hindi and English. Breaking news, in-depth analysis on Politics, Business, Technology, Sports, and Entertainment.',
  keywords: ['Digital Jagran', 'Hindi News', 'English News', 'India News', 'Breaking News', 'Politics', 'Business', 'Technology', 'Sports', 'Entertainment', 'Bilingual News'],
  authors: [{ name: 'Digital Jagran', url: 'https://www.digitaljagran.com' }],
  creator: 'Digital Jagran',
  publisher: 'Digital Jagran',
  metadataBase: new URL('https://www.digitaljagran.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Digital Jagran',
    title: 'Digital Jagran | Latest News in Hindi & English',
    description: 'India\'s trusted bilingual news platform. Breaking news, analysis on Politics, Business, Tech, Sports, Entertainment.',
    url: 'https://www.digitaljagran.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Jagran | Latest News in Hindi & English',
    description: 'India\'s trusted bilingual news platform. Breaking news in Hindi & English.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'pub-4203996500031256',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable} ${yantramanav.variable}`}>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4203996500031256"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-sans antialiased">
        {/* Organization + WebSite structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://www.digitaljagran.com/#organization',
                  name: 'Digital Jagran',
                  url: 'https://www.digitaljagran.com',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://www.digitaljagran.com/logo.png',
                  },
                  description: 'India\'s trusted bilingual digital news platform delivering comprehensive journalism in Hindi and English.',
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'customer service',
                    email: 'contact@digitaljagran.com',
                  },
                  publishingPrinciples: 'https://www.digitaljagran.com/about',
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://www.digitaljagran.com/#website',
                  url: 'https://www.digitaljagran.com',
                  name: 'Digital Jagran',
                  description: 'India\'s trusted bilingual news platform',
                  publisher: {
                    '@id': 'https://www.digitaljagran.com/#organization',
                  },
                  inLanguage: ['en', 'hi'],
                  potentialAction: {
                    '@type': 'ReadAction',
                    target: 'https://www.digitaljagran.com',
                  },
                },
              ],
            }),
          }}
        />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

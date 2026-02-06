import React from 'react';
import type { Metadata } from 'next';
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
  title: 'Digital Jagran - Hindi News & Media',
  description: 'Latest Hindi News, Breaking News, and Analysis from Digital Jagran.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable} ${yantramanav.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

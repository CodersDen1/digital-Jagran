import { Suspense } from 'react';
import HomePage from '@/components/pages/HomePage';
import { Metadata } from 'next';
import { Loader } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Digital Jagran | Latest News in Hindi & English',
  description: 'India\'s premier bilingual news platform delivering comprehensive coverage in both Hindi and English. Stay informed with breaking news, in-depth analysis across Politics, Business, and Tech.',
  keywords: 'Digital Jagran, Hindi News, English News, India News, Breaking News, Politics, Business, Technology, Sports, Entertainment',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Digital Jagran',
    title: 'Digital Jagran | Latest News in Hindi & English',
    description: 'India\'s premier bilingual news platform. Breaking news, analysis on Politics, Business, Tech, Sports, Entertainment.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Jagran | Latest News in Hindi & English',
    description: 'India\'s premier bilingual news platform. Breaking news, analysis on Politics, Business, Tech, Sports, Entertainment in Hindi & English.',
  }
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-brand-red" size={32} /></div>}>
      <HomePage />
    </Suspense>
  );
}

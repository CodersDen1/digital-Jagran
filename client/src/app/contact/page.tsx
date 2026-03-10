import { Suspense } from 'react';
import { Metadata } from 'next';
import NewsLayout from '@/components/layout/NewsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us | Digital Jagran',
  description: 'Get in touch with Digital Jagran. Reach out for news tips, feedback, advertising inquiries, or partnership opportunities. We\'d love to hear from you.',
  alternates: {
    canonical: 'https://www.digitaljagran.com/contact',
  },
  openGraph: {
    title: 'Contact Us | Digital Jagran',
    description: 'Get in touch with Digital Jagran for news tips, feedback, advertising, or partnerships.',
    type: 'website',
    url: 'https://www.digitaljagran.com/contact',
    siteName: 'Digital Jagran',
  },
};

function ContactContent() {
  return (
    <NewsLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-red">Home</Link></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">Contact Us</li>
          </ol>
        </nav>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-gray-900 mb-6 border-l-4 border-brand-red pl-4">
          Contact Us
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            We value your feedback, news tips, and suggestions. Whether you have a story idea, want to report an issue,
            or are interested in working with us, we&apos;d love to hear from you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="font-serif font-bold text-xl text-gray-900 mb-4">General Inquiries</h2>
              <p className="text-sm mb-2">For general questions and feedback:</p>
              <p className="font-medium">contact@digitaljagran.com</p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="font-serif font-bold text-xl text-gray-900 mb-4">News Tips</h2>
              <p className="text-sm mb-2">Have a story tip or breaking news lead?</p>
              <p className="font-medium">news@digitaljagran.com</p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="font-serif font-bold text-xl text-gray-900 mb-4">Advertising & Partnerships</h2>
              <p className="text-sm mb-2">For advertising and business opportunities:</p>
              <p className="font-medium">ads@digitaljagran.com</p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="font-serif font-bold text-xl text-gray-900 mb-4">Editorial</h2>
              <p className="text-sm mb-2">For corrections, retractions, or editorial concerns:</p>
              <p className="font-medium">editor@digitaljagran.com</p>
            </section>
          </div>

          <section className="mt-8">
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Our Office</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p><strong>Digital Jagran Media</strong></p>
              <p>India</p>
              <p className="mt-4 text-sm text-gray-500">
                For the fastest response, please contact us via email. We aim to respond to all inquiries within 24–48 hours.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Feedback</h2>
            <p>
              Your feedback helps us improve. If you&apos;ve noticed an error in our reporting, have a suggestion for
              coverage, or want to share your experience using our platform, please don&apos;t hesitate to reach out.
              Every piece of feedback is carefully reviewed by our team.
            </p>
          </section>
        </div>

        {/* Contact Page JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ContactPage',
              name: 'Contact Digital Jagran',
              description: 'Get in touch with Digital Jagran for news tips, feedback, advertising, or partnerships.',
              url: 'https://www.digitaljagran.com/contact',
              mainEntity: {
                '@type': 'Organization',
                name: 'Digital Jagran',
                url: 'https://www.digitaljagran.com',
                email: 'contact@digitaljagran.com',
                contactPoint: [
                  {
                    '@type': 'ContactPoint',
                    contactType: 'customer service',
                    email: 'contact@digitaljagran.com',
                  },
                  {
                    '@type': 'ContactPoint',
                    contactType: 'editorial',
                    email: 'editor@digitaljagran.com',
                  },
                  {
                    '@type': 'ContactPoint',
                    contactType: 'advertising',
                    email: 'ads@digitaljagran.com',
                  },
                ],
              }
            })
          }}
        />
      </article>
    </NewsLayout>
  );
}

export default function ContactPage() {
  return (
    <Suspense>
      <ContactContent />
    </Suspense>
  );
}

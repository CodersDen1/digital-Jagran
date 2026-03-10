import { Metadata } from 'next';
import NewsLayout from '@/components/layout/NewsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Disclaimer | Digital Jagran',
  description: 'Read the disclaimer for Digital Jagran. Understand the limitations and conditions regarding the use of news and information published on our platform.',
  alternates: {
    canonical: 'https://www.digitaljagran.com/disclaimer',
  },
  openGraph: {
    title: 'Disclaimer | Digital Jagran',
    description: 'Understand the limitations regarding news content on Digital Jagran.',
    type: 'website',
    url: 'https://www.digitaljagran.com/disclaimer',
    siteName: 'Digital Jagran',
  },
};

export default function DisclaimerPage() {
  return (
    <NewsLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-red">Home</Link></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">Disclaimer</li>
          </ol>
        </nav>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-gray-900 mb-2 border-l-4 border-brand-red pl-4">
          Disclaimer
        </h1>
        <p className="text-sm text-gray-500 mb-8 pl-5">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            The information provided on <strong>Digital Jagran</strong> (<strong>digitaljagran.com</strong>) is for
            general informational and educational purposes only. While we strive to keep the information
            up-to-date and accurate, we make no representations or warranties of any kind, express or implied,
            about the completeness, accuracy, reliability, or availability of the information, products, services,
            or related graphics contained on the Site.
          </p>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">News Content</h2>
            <p>
              All news articles, reports, and analyses published on Digital Jagran are based on information
              available at the time of publication. News situations evolve rapidly, and earlier reports may be
              updated or corrected as new information becomes available. Readers are encouraged to verify
              information from multiple sources before making decisions based on news content.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Opinion and Analysis</h2>
            <p>
              Opinion pieces, editorials, and analytical articles published on Digital Jagran represent the views
              of their respective authors and do not necessarily reflect the official position of Digital Jagran.
              These are provided to foster informed public discourse and should not be taken as factual reporting.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">No Professional Advice</h2>
            <p>
              Content on this Site does not constitute professional advice of any kind, including but not limited to
              legal, financial, medical, or investment advice. Always seek the guidance of qualified professionals
              before making important decisions.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">External Links</h2>
            <p>
              Our Site may contain links to external websites that are not provided or maintained by Digital Jagran.
              We do not guarantee the accuracy, relevance, timeliness, or completeness of any information on these
              external websites. The inclusion of any link does not imply endorsement or recommendation.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Translations</h2>
            <p>
              Digital Jagran publishes content in both Hindi and English. While we ensure quality in both languages,
              translations may occasionally contain minor variations. In case of any discrepancy between language
              versions, the original language of the article shall be considered authoritative.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Advertising Disclaimer</h2>
            <p>
              Digital Jagran displays third-party advertisements through advertising networks including Google AdSense.
              These advertisements are clearly distinguishable from editorial content. The appearance of advertisements
              does not constitute endorsement of the advertised products or services by Digital Jagran. Advertisers are
              solely responsible for the accuracy and content of their advertisements.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Images and Media</h2>
            <p>
              Images used on Digital Jagran are either originally created by our team, licensed from stock photo
              providers, or used within the scope of fair use for news reporting purposes. If you believe any
              content infringes upon your copyright, please contact us at <strong>editor@digitaljagran.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
            <p>
              In no event shall Digital Jagran be liable for any loss or damage including, without limitation,
              indirect or consequential loss or damage, arising out of or in connection with the use of this Site.
              Your use of the Site and reliance on any information on the Site is solely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Disclaimer, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p><strong>Digital Jagran</strong></p>
              <p>Email: contact@digitaljagran.com</p>
              <p>Website: <Link href="/" className="text-brand-red hover:underline">www.digitaljagran.com</Link></p>
            </div>
          </section>
        </div>
      </article>
    </NewsLayout>
  );
}

import { Metadata } from 'next';
import NewsLayout from '@/components/layout/NewsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Digital Jagran',
  description: 'Read Digital Jagran\'s Privacy Policy. Learn how we collect, use, protect, and share your personal information when you visit our news platform.',
  alternates: {
    canonical: 'https://www.digitaljagran.com/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | Digital Jagran',
    description: 'Learn how Digital Jagran collects, uses, and protects your personal information.',
    type: 'website',
    url: 'https://www.digitaljagran.com/privacy-policy',
    siteName: 'Digital Jagran',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <NewsLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-red">Home</Link></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">Privacy Policy</li>
          </ol>
        </nav>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-gray-900 mb-2 border-l-4 border-brand-red pl-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8 pl-5">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            At <strong>Digital Jagran</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we are committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website
            at <strong>digitaljagran.com</strong> (the &quot;Site&quot;).
          </p>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <h3 className="font-bold text-lg text-gray-900 mt-4 mb-2">1.1 Information You Provide</h3>
            <p>We may collect information you voluntarily provide, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Email address (when subscribing to our newsletter)</li>
              <li>Name and contact details (when reaching out via email)</li>
              <li>Any other information you choose to provide</li>
            </ul>

            <h3 className="font-bold text-lg text-gray-900 mt-4 mb-2">1.2 Automatically Collected Information</h3>
            <p>When you visit our Site, we may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Device information (browser type, operating system, screen resolution)</li>
              <li>IP address and approximate geographic location</li>
              <li>Pages viewed, time spent on pages, and navigation paths</li>
              <li>Referring website addresses</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>To deliver and improve our news content and user experience</li>
              <li>To send newsletters and updates (only if you opted in)</li>
              <li>To analyze site usage and optimize performance</li>
              <li>To display relevant advertisements through third-party ad networks</li>
              <li>To respond to inquiries and provide customer support</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">3. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to enhance your browsing experience, analyze traffic,
              and serve personalized advertisements. Types of cookies we use include:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Essential Cookies:</strong> Required for basic site functionality.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our Site.</li>
              <li><strong>Advertising Cookies:</strong> Used by ad partners (including Google AdSense) to serve relevant ads.</li>
            </ul>
            <p className="mt-4">
              You can manage your cookie preferences through your browser settings. Please note that disabling
              certain cookies may affect your experience on our Site.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">4. Third-Party Advertising</h2>
            <p>
              We use <strong>Google AdSense</strong> and other third-party advertising services to display advertisements on our Site.
              These services may use cookies and web beacons to collect information about your visits to this and other
              websites to provide relevant advertisements. Google&apos;s use of advertising cookies enables it and its partners
              to serve ads based on your visit to our Site and/or other sites on the Internet.
            </p>
            <p className="mt-2">
              You may opt out of personalized advertising by visiting{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">
                Google Ads Settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">5. Data Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (hosting, analytics, advertising).</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government request.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet
              is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{' '}
              <strong>contact@digitaljagran.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">8. Children&apos;s Privacy</h2>
            <p>
              Our Site is not intended for children under the age of 13. We do not knowingly collect personal information
              from children. If we become aware that we have collected personal information from a child under 13,
              we will take steps to delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with
              an updated &quot;Last Updated&quot; date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">10. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at:
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

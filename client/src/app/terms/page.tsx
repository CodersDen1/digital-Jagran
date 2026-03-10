import { Metadata } from 'next';
import NewsLayout from '@/components/layout/NewsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Digital Jagran',
  description: 'Read the Terms of Service for Digital Jagran. Understand the rules, conditions, and guidelines for using our bilingual news platform.',
  alternates: {
    canonical: 'https://www.digitaljagran.com/terms',
  },
  openGraph: {
    title: 'Terms of Service | Digital Jagran',
    description: 'Understand the rules and guidelines for using Digital Jagran.',
    type: 'website',
    url: 'https://www.digitaljagran.com/terms',
    siteName: 'Digital Jagran',
  },
};

export default function TermsPage() {
  return (
    <NewsLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-red">Home</Link></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">Terms of Service</li>
          </ol>
        </nav>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-gray-900 mb-2 border-l-4 border-brand-red pl-4">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-8 pl-5">Last Updated: March 2026</p>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to <strong>Digital Jagran</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing and using our website at
            <strong> digitaljagran.com</strong> (the &quot;Site&quot;), you agree to be bound by these Terms of Service
            (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our Site.
          </p>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">1. Use of the Site</h2>
            <p>You agree to use this Site only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Site in any way that violates applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any part of the Site or its systems</li>
              <li>Use automated systems (bots, scrapers) to access the Site without our permission</li>
              <li>Transmit any viruses, malware, or harmful code</li>
              <li>Interfere with or disrupt the Site&apos;s operation or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">2. Intellectual Property</h2>
            <p>
              All content on Digital Jagran — including text, graphics, logos, images, articles, and software — is the property
              of Digital Jagran or its content providers and is protected by Indian and international copyright, trademark,
              and intellectual property laws.
            </p>
            <p className="mt-2">You may not:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Reproduce, distribute, or republish our content without express written permission</li>
              <li>Modify, create derivative works, or reverse-engineer any part of the Site</li>
              <li>Use our content for commercial purposes without a licensing agreement</li>
            </ul>
            <p className="mt-2">
              Limited sharing of article links on social media and personal platforms is permitted and encouraged,
              provided proper attribution to Digital Jagran is given.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">3. User-Generated Content</h2>
            <p>
              If you submit any content to Digital Jagran (such as comments, feedback, or news tips), you grant us a
              non-exclusive, royalty-free, worldwide license to use, display, and distribute such content in connection
              with our services. You represent that you have the right to submit such content.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">4. Accuracy of Information</h2>
            <p>
              While we strive for accuracy in all our reporting, Digital Jagran does not warrant that the information
              on the Site is complete, reliable, or error-free. News content is provided for general informational
              purposes only and should not be relied upon as professional advice.
            </p>
            <p className="mt-2">
              We make prompt corrections when errors are identified. If you notice an inaccuracy, please
              contact us at <strong>editor@digitaljagran.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">5. Third-Party Links</h2>
            <p>
              Our Site may contain links to third-party websites. These links are provided for your convenience
              and do not signify our endorsement of such websites. We are not responsible for the content, privacy
              practices, or terms of any third-party websites.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">6. Advertising</h2>
            <p>
              Digital Jagran displays advertisements through third-party ad networks, including Google AdSense.
              The presence of advertisements does not constitute endorsement of the advertised products or services.
              Advertisers are solely responsible for the content and accuracy of their advertisements.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">7. Disclaimer of Warranties</h2>
            <p>
              The Site is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Digital Jagran makes no warranties,
              expressed or implied, regarding the Site&apos;s operation, availability, or the accuracy of content.
              To the fullest extent permitted by law, we disclaim all warranties including implied warranties of
              merchantability and fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Digital Jagran shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out of your use of or inability to use
              the Site, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India.
              Any disputes arising from these Terms or use of the Site shall be subject to the exclusive
              jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">10. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon
              posting on this page. Your continued use of the Site after changes are posted constitutes your
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">11. Contact</h2>
            <p>If you have questions about these Terms of Service, please contact us:</p>
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

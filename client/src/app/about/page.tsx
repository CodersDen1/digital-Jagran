import { Metadata } from 'next';
import NewsLayout from '@/components/layout/NewsLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | Digital Jagran - Hindi & English News Platform',
  description: 'Learn about Digital Jagran, India\'s trusted bilingual news platform delivering comprehensive journalism in Hindi and English. Our mission, values, and editorial standards.',
  alternates: {
    canonical: 'https://www.digitaljagran.com/about',
  },
  openGraph: {
    title: 'About Us | Digital Jagran',
    description: 'Learn about Digital Jagran, India\'s trusted bilingual news platform delivering comprehensive journalism in Hindi and English.',
    type: 'website',
    url: 'https://www.digitaljagran.com/about',
    siteName: 'Digital Jagran',
  },
};

export default function AboutPage() {
  return (
    <NewsLayout>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-red">Home</Link></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">About Us</li>
          </ol>
        </nav>

        <h1 className="font-serif font-bold text-3xl md:text-4xl text-gray-900 mb-6 border-l-4 border-brand-red pl-4">
          About Digital Jagran
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Who We Are</h2>
            <p>
              <strong>Digital Jagran</strong> is India&apos;s trusted bilingual digital news platform, committed to delivering
              accurate, timely, and comprehensive journalism in both <strong>Hindi</strong> and <strong>English</strong>. We bridge
              the language divide, ensuring that quality news and analysis reach every reader regardless of their preferred language.
            </p>
            <p>
              Founded with the vision of making reliable journalism accessible to all, Digital Jagran covers a wide range of topics
              including <strong>Politics, Business, Technology, Sports, Entertainment</strong>, and more. Our team of experienced
              journalists and editors works around the clock to bring you stories that matter.
            </p>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Our Mission</h2>
            <p>
              Our mission is to empower readers with accurate, balanced, and insightful news that helps them make informed decisions.
              We believe in the power of responsible journalism to foster a well-informed society.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Accuracy First</strong> — Every story is fact-checked and verified before publication.</li>
              <li><strong>Bilingual Reach</strong> — Content available in both Hindi and English for maximum accessibility.</li>
              <li><strong>Comprehensive Coverage</strong> — From breaking news to deep analysis across all major sectors.</li>
              <li><strong>Reader-Centric</strong> — Clean, fast, ad-friendly reading experience on all devices.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Editorial Standards</h2>
            <p>
              Digital Jagran maintains strict editorial standards to ensure the integrity and trustworthiness of our reporting:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>All news stories undergo a multi-layer editorial review process.</li>
              <li>We clearly distinguish between news reporting and opinion pieces.</li>
              <li>Sources are verified independently, and corrections are issued promptly when errors occur.</li>
              <li>We adhere to ethical journalism practices as outlined by the Press Council of India.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">What We Cover</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">National & International News</h3>
                <p className="text-sm">Comprehensive coverage of events across India and around the world.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Politics & Governance</h3>
                <p className="text-sm">In-depth analysis of political developments and policy decisions.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Business & Economy</h3>
                <p className="text-sm">Market updates, economic analysis, and corporate news.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Technology & Science</h3>
                <p className="text-sm">Latest innovations, tech reviews, and scientific discoveries.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Sports</h3>
                <p className="text-sm">Live updates, match analysis, and sports features.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Entertainment</h3>
                <p className="text-sm">Bollywood, cinema, music, and cultural stories.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif font-bold text-2xl text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p>
              We value your feedback and suggestions. Reach out to us through our{' '}
              <Link href="/contact" className="text-brand-red hover:underline">Contact Page</Link> for any inquiries,
              news tips, or partnership opportunities.
            </p>
          </section>
        </div>

        {/* About Page JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'AboutPage',
              name: 'About Digital Jagran',
              description: 'India\'s trusted bilingual digital news platform delivering journalism in Hindi and English.',
              url: 'https://www.digitaljagran.com/about',
              mainEntity: {
                '@type': 'NewsMediaOrganization',
                name: 'Digital Jagran',
                url: 'https://www.digitaljagran.com',
                logo: 'https://www.digitaljagran.com/logo.png',
                sameAs: [],
                foundingDate: '2024',
                description: 'India\'s trusted bilingual digital news platform.',
              }
            })
          }}
        />
      </article>
    </NewsLayout>
  );
}

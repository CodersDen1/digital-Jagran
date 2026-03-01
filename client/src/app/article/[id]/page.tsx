import { Suspense } from 'react';
import ArticleDetailPage from '@/components/pages/ArticleDetailPage';
import { getArticleById } from '@/services/api';
import { generateArticleMetadata } from '@/utils/metaTags';
import { Metadata, ResolvingMetadata } from 'next';
import { Loader } from 'lucide-react';

// ISR: Revalidate article pages every 5 minutes
export const revalidate = 300;
export const dynamicParams = true;

/* eslint-disable @typescript-eslint/no-explicit-any */
interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(
    { params }: PageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await params;

    try {
        const article = await getArticleById(id);
        if (!article) {
            return {
                title: 'Article Not Found | Digital Jagran'
            };
        }

        // Use the utility we migrated primarily for article metadata
        return generateArticleMetadata(article);
    } catch (error) {
        console.error('Error fetching metadata for article:', error);
        return {
            title: 'Digital Jagran'
        };
    }
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    let initialArticle = null;

    try {
        initialArticle = await getArticleById(id);
    } catch (e) {
        console.error('Failed to fetch initial article server-side:', e);
    }

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-brand-red" size={32} /></div>}>
            {initialArticle && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'NewsArticle',
                            headline: initialArticle.metaTitle || initialArticle.article_header,
                            image: initialArticle.photos || [initialArticle.featuredImage],
                            datePublished: initialArticle.createdAt,
                            dateModified: initialArticle.updatedAt,
                            author: [{
                                '@type': 'Person',
                                name: initialArticle.author || 'Digital Jagran',
                                url: 'https://www.digitaljagran.com'
                            }]
                        })
                    }}
                />
            )}
            <ArticleDetailPage id={id} initialArticle={initialArticle} />
        </Suspense>
    );
}

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getArticleById,
    getLayoutById,
    getDefaultLayout,
    getArticles,
    trackArticleView,
    getFreeformLayoutById,
    getArticleHtmlContent
} from '@/services/api';
import NewsLayout from '@/components/layout/NewsLayout';
import DynamicArticleRenderer from '@/components/article/DynamicArticleRenderer';
import ShadowHtmlRenderer from '@/components/article/ShadowHtmlRenderer';
import { SocialShare } from '@/components/article/ElementRenderers';
import { useLanguage } from '@/context/LanguageContext';
import { Loader, ArrowLeft, Clock } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ArticleDetailPageProps {
    id: string;
    initialArticle?: any;
}

const ArticleDetailPage = ({ id, initialArticle }: ArticleDetailPageProps) => {
    const { t, language } = useLanguage();
    const router = useRouter();

    // State
    const [article, setArticle] = useState<any>(initialArticle || null);
    const [layout, setLayout] = useState<any>(null);
    const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(!initialArticle);
    const viewTrackedRef = useRef(false);

    // Initial Fetch (if no initialArticle) or if ID changes
    useEffect(() => {
        if (!initialArticle || article?._id !== id) {
            fetchArticleMain();
        } else {
            // If we have initial article, we still need layout and related
            fetchSecondaryData(initialArticle);
        }
        window.scrollTo(0, 0);
        viewTrackedRef.current = false;
    }, [id, language]);

    // Track View
    useEffect(() => {
        if (article && !viewTrackedRef.current) {
            trackArticleView(id);
            viewTrackedRef.current = true;
        }
    }, [article, id]);

    const fetchArticleMain = async () => {
        setLoading(true);
        try {
            const articleData = await getArticleById(id);
            setArticle(articleData);
            await fetchSecondaryData(articleData);
        } catch (error) {
            console.error('Error fetching article:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSecondaryData = async (articleData: any) => {
        try {
            // Parallel fetches for layout and HTML content
            const promises: Promise<any>[] = [];

            // Handle HTML Storage
            if (articleData.storage_type === 'html') {
                const path = language === 'en' ? articleData.html_path_en : articleData.html_path;
                if (path) {
                    const r2BaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
                    if (r2BaseUrl) {
                        promises.push(
                            fetch(`${r2BaseUrl}/${path}`)
                                .then(r => r.ok ? r.text() : null)
                                .catch(() => null)
                        );
                    } else {
                        promises.push(
                            getArticleHtmlContent(id, language).catch(() => null)
                        );
                    }
                } else {
                    promises.push(Promise.resolve(null));
                }
            } else {
                promises.push(Promise.resolve(null));
            }

            // Fetch Layout (only for non-HTML storage)
            if (articleData.storage_type !== 'html' && articleData.layoutTemplate) {
                promises.push(
                    getLayoutById(articleData.layoutTemplate)
                        .then(l => l ? { ...l, layoutType: 'grid' } : null)
                        .catch(() =>
                            getFreeformLayoutById(articleData.layoutTemplate)
                                .then(l => l ? { ...l, layoutType: 'freeform' } : null)
                                .catch(() => null)
                        )
                );
            } else if (articleData.storage_type !== 'html') {
                promises.push(getDefaultLayout().catch(() => null));
            } else {
                promises.push(Promise.resolve(null));
            }

            // Fetch Related Articles (use already-fetched published articles, not ALL)
            promises.push(getArticles().catch(() => []));

            const [htmlResult, layoutData, allArticles] = await Promise.all(promises);

            if (htmlResult) setHtmlContent(htmlResult);
            setLayout(layoutData);

            // Filter related articles
            const visibleArticles = (allArticles || []).filter((a: any) => {
                if (language === 'en') {
                    return a.published_language === 'en' || a.published_language === 'both';
                } else {
                    return a.published_language === 'hi' || a.published_language === 'HN' || a.published_language === 'both';
                }
            });

            const articleTags = articleData.tags_en || articleData.tags || [];
            const related = visibleArticles
                .filter((a: any) => a._id !== id)
                .filter((a: any) => {
                    const tags = a.tags_en || a.tags || [];
                    return tags.some((tag: string) => articleTags.includes(tag));
                })
                .slice(0, 4);

            setRelatedArticles(related.length > 0 ? related : visibleArticles.filter((a: any) => a._id !== id).slice(0, 4));

        } catch (error) {
            console.error('Error fetching secondary data:', error);
        }
    };

    if (loading) {
        return (
            <NewsLayout>
                <div className="flex justify-center items-center h-64">
                    <Loader className="animate-spin text-brand-red" size={48} />
                </div>
            </NewsLayout>
        );
    }

    if (!article) {
        return (
            <NewsLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Article Not Found</h2>
                    <p className="text-gray-500 mb-6">The article you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href="/"
                        title="Back to Home"
                        className="inline-flex items-center gap-2 text-brand-red hover:underline"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>
                </div>
            </NewsLayout>
        );
    }

    return (
        <NewsLayout>
            {/* Back Button */}
            <div className="mb-6">
                <Link
                    href="/"
                    title="Back to News"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-red transition"
                >
                    <ArrowLeft size={20} />
                    <span>Back to News</span>
                </Link>
            </div>

            {/* Main Article Content */}
            <div className={`${(article?.published_language === 'HN' || article?.published_language === 'hi') ? 'bg-slate-50' : 'bg-white'} p-4 md:p-8 shadow-none md:shadow-sm rounded-none md:rounded-lg mb-8`}>
                {htmlContent ? (
                    <ShadowHtmlRenderer htmlContent={htmlContent} className="w-full relative mx-auto overflow-hidden" />
                ) : (
                    <DynamicArticleRenderer article={article} layout={layout} />
                )}

                {/* Social Share Bar */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <SocialShare article={article} t={t} />

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {Math.ceil((t(article, 'body')?.length || 0) / 1000)} min read
                        </span>
                    </div>
                </div>
            </div>

            {/* Related Articles Section */}
            {relatedArticles.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif font-bold text-2xl mb-6 border-l-4 border-brand-red pl-3">
                        Related Stories
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedArticles.map(relatedArticle => (
                            <Link
                                key={relatedArticle._id}
                                href={`/article/${relatedArticle.slug || relatedArticle._id}`}
                                title={t(relatedArticle, 'article_header')}
                                className="group block bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition"
                            >
                                {relatedArticle.photos && relatedArticle.photos[0] && (
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={relatedArticle.photos[0]}
                                            alt={t(relatedArticle, 'article_header')}
                                            title={t(relatedArticle, 'article_header')}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="font-serif font-bold text-gray-900 line-clamp-2 group-hover:text-brand-red transition">
                                        {t(relatedArticle, 'article_header')}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                        {t(relatedArticle, 'summary')}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </NewsLayout>
    );
};

export default ArticleDetailPage;

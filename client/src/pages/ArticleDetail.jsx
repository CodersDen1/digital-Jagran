import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticleById, getLayoutById, getDefaultLayout, getArticles, trackArticleView, getFreeformLayoutById, getArticleHtmlContent } from '../services/api';
import NewsLayout from '../components/layout/NewsLayout';
import DynamicArticleRenderer from '../components/article/DynamicArticleRenderer';
import ShadowHtmlRenderer from '../components/article/ShadowHtmlRenderer';
import { SocialShare } from '../components/article/ElementRenderers';
import { useLanguage } from '../context/LanguageContext';
import { Loader, ArrowLeft, Clock, Eye } from 'lucide-react';

import { Helmet } from 'react-helmet-async';

const ArticleDetail = () => {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const [article, setArticle] = useState(null);
    const [layout, setLayout] = useState(null);
    const [relatedArticles, setRelatedArticles] = useState([]);
    const [htmlContent, setHtmlContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const viewTrackedRef = useRef(false);

    // Helper function to truncate title to max 65 characters with ellipsis
    const truncateTitle = (title, maxLength = 65) => {
        if (!title) return '';
        const suffix = ' | Digital Jagran';
        const availableLength = maxLength - suffix.length;
        if (title.length <= availableLength) {
            return title + suffix;
        }
        return title.substring(0, availableLength - 3) + '...' + suffix;
    };

    // Get the raw title for meta tags
    const getArticleTitle = () => {
        // Try English specific fields first if language is English
        if (language === 'en') {
            return article?.metaTitle_en || article?.article_header_en || article?.metaTitle || article?.article_header || '';
        }
        // Fallback or Hindi
        return article?.metaTitle || article?.article_header || '';
    };

    // Get description for meta tags
    const getArticleDescription = () => {
        if (language === 'en') {
            return article?.metaDescription_en || article?.summary_en || article?.metadata_en || article?.metaDescription || article?.summary || article?.metadata || '';
        }
        return article?.metaDescription || article?.summary || article?.metadata || '';
    };

    useEffect(() => {
        fetchArticle();
        window.scrollTo(0, 0);
        // Reset view tracking when article changes
        viewTrackedRef.current = false;
    }, [id, language]);

    // Track view when article is loaded
    useEffect(() => {
        if (article && !viewTrackedRef.current) {
            trackArticleView(id);
            viewTrackedRef.current = true;
        }
    }, [article, id]);

    const fetchArticle = async () => {
        setLoading(true);
        try {
            // Fetch article
            const articleData = await getArticleById(id);
            setArticle(articleData);



            // Handle HTML Storage
            // Handle HTML Storage
            if (articleData.storage_type === 'html') {
                try {
                    const path = language === 'en' ? articleData.html_path_en : articleData.html_path;
                    if (path) {
                        const r2BaseUrl = import.meta.env.VITE_R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev
                        // If public URL is configured, fetch directly (bypass backend)
                        if (r2BaseUrl) {
                            const url = `${r2BaseUrl}/${path}?t=${new Date().getTime()}`;
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Failed to fetch from R2');
                            const html = await response.text();
                            setHtmlContent(html);
                        } else {
                            // Fallback to backend proxy (for localhost or if R2 domain not set)
                            const html = await getArticleHtmlContent(id, language);
                            setHtmlContent(html);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load HTML content:', e);
                }
                // Even if HTML fails, we might still have metadata, but logic below for layout might be skipped or irrelevant
            }

            // Fetch layout - either article-specific or default
            // Skip layout fetching if we are in HTML mode (pre-rendered)
            let layoutData = null;
            if (articleData.storage_type !== 'html') {
                if (articleData.layoutTemplate) {
                    // Try grid layout first
                    try {
                        layoutData = await getLayoutById(articleData.layoutTemplate);
                        if (layoutData) {
                            layoutData.layoutType = 'grid';
                        }
                    } catch (e) {
                        console.log('Grid layout not found, trying freeform layout');
                    }

                    // If grid layout not found, try freeform layout
                    if (!layoutData) {
                        try {
                            layoutData = await getFreeformLayoutById(articleData.layoutTemplate);
                            if (layoutData) {
                                layoutData.layoutType = 'freeform';
                            }
                        } catch (e) {
                            console.log('Freeform layout not found, trying default');
                        }
                    }
                }
            }

            if (!layoutData) {
                layoutData = await getDefaultLayout();
            }

            setLayout(layoutData);

            // Fetch related articles (based on tags)
            const allArticles = await getArticles();

            // Filter by language
            const visibleArticles = allArticles.filter(article => {
                if (language === 'en') {
                    return article.published_language === 'en' || article.published_language === 'both';
                } else {
                    return article.published_language === 'hi' || article.published_language === 'HN' || article.published_language === 'both';
                }
            });

            const articleTags = articleData.tags_en || articleData.tags || [];
            const related = visibleArticles
                .filter(a => a._id !== id)
                .filter(a => {
                    const tags = a.tags_en || a.tags || [];
                    return tags.some(tag => articleTags.includes(tag));
                })
                .slice(0, 4);

            setRelatedArticles(related.length > 0 ? related : visibleArticles.filter(a => a._id !== id).slice(0, 4));

        } catch (error) {
            console.error('Error fetching article:', error);
        } finally {
            setLoading(false);
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
                        to="/"
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
            {article && (
                <Helmet>
                    {/* Basic SEO - Always use English SEO fields */}
                    <title>{truncateTitle(getArticleTitle())}</title>
                    <meta name="description" content={getArticleDescription()} />
                    <meta name="keywords" content={
                        (article.metaKeywords && article.metaKeywords.length > 0
                            ? article.metaKeywords
                            : (article.keywords && article.keywords.length > 0 ? article.keywords : [])
                        ).join(', ')
                    } />
                    {/* Canonical URL - Fallback to current URL if not present */}
                    <link rel="canonical" href={article.canonicalUrl || window.location.href.split('?')[0]} />

                    {/* Open Graph / Facebook */}
                    <meta property="og:type" content="article" />
                    <meta property="article:publisher" content="https://www.facebook.com/digitaljagran" />
                    <meta property="og:title" content={truncateTitle(getArticleTitle())} />
                    <meta property="og:description" content={getArticleDescription()} />
                    {article.photos && article.photos.length > 0 && <meta property="og:image" content={article.photos[0]} />}
                    <meta property="og:url" content={window.location.href} />

                    {/* Twitter */}
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content={truncateTitle(getArticleTitle())} />
                    <meta name="twitter:description" content={getArticleDescription()} />
                    {article.photos && article.photos.length > 0 && <meta name="twitter:image" content={article.photos[0]} />}

                    {/* Schema.org for Google */}
                    <script type="application/ld+json">
                        {JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "NewsArticle",
                            "headline": getArticleTitle(),
                            "image": article.photos || [],
                            "datePublished": article.createdAt,
                            "dateModified": article.updatedAt,
                            "author": [{
                                "@type": "Person",
                                "name": article.author || "Digital Jagran"
                            }],
                            "publisher": {
                                "@type": "Organization",
                                "name": "Digital Jagran",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": "https://digitaljagran.com/logo.png" // Replace with actual logo if available
                                }
                            },
                            "description": getArticleDescription(),
                            "articleBody": htmlContent ? htmlContent.replace(/<[^>]+>/g, ' ') : (t(article, 'body') || '')
                        })}
                    </script>
                </Helmet>
            )}

            {/* Back Button */}
            <div className="mb-6">
                <Link
                    to="/"
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
                                to={`/article/${relatedArticle.slug || relatedArticle._id}`}
                                title={t(relatedArticle, 'article_header')}
                                className="group block bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition"
                            >
                                {relatedArticle.photos && relatedArticle.photos[0] && (
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={relatedArticle.photos[0]}
                                            alt={t(relatedArticle, 'article_header')}
                                            title={t(relatedArticle, 'article_header')}
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

export default ArticleDetail;


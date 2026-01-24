import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticleById, getLayoutById, getDefaultLayout, getArticles, trackArticleView } from '../services/api';
import NewsLayout from '../components/layout/NewsLayout';
import DynamicArticleRenderer from '../components/article/DynamicArticleRenderer';
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
    const [loading, setLoading] = useState(true);
    const viewTrackedRef = useRef(false);

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

            // Fetch layout - either article-specific or default
            let layoutData = null;
            if (articleData.layoutTemplate) {
                try {
                    layoutData = await getLayoutById(articleData.layoutTemplate);
                } catch (e) {
                    console.log('Article layout not found, trying default');
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
                    <title>{article.metaTitle || article.article_header_en || article.article_header} | Digital Jagaran</title>
                    <meta name="description" content={article.metadata || ''} />
                    <meta name="keywords" content={
                        (article.metaKeywords && article.metaKeywords.length > 0
                            ? article.metaKeywords
                            : (article.keywords && article.keywords.length > 0 ? article.keywords : [])
                        ).join(', ')
                    } />
                    {article.canonicalUrl && <link rel="canonical" href={article.canonicalUrl} />}

                    {/* Open Graph / Facebook */}
                    <meta property="og:type" content="article" />
                    <meta property="og:title" content={article.metaTitle || article.article_header_en || article.article_header} />
                    <meta property="og:description" content={article.metadata || ''} />
                    {article.photos && article.photos.length > 0 && <meta property="og:image" content={article.photos[0]} />}
                    <meta property="og:url" content={window.location.href} />

                    {/* Twitter */}
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content={article.metaTitle || article.article_header_en || article.article_header} />
                    <meta name="twitter:description" content={article.metadata || ''} />
                    {article.photos && article.photos.length > 0 && <meta name="twitter:image" content={article.photos[0]} />}
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
            <div className="bg-white p-4 md:p-8 shadow-sm rounded-lg mb-8">
                <DynamicArticleRenderer article={article} layout={layout} />

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
                                to={`/article/${relatedArticle._id}`}
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


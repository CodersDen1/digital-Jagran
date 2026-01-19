import React, { useEffect, useState } from 'react';
import { getArticles } from '../services/api';
import NewsLayout from '../components/layout/NewsLayout';
import NewsCard from '../components/common/NewsCard';
import { useLanguage } from '../context/LanguageContext';
import { Loader, ChevronRight, TrendingUp, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const { t } = useLanguage();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['All', 'Politics', 'Business', 'Tech', 'Sports', 'Entertainment'];

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await getArticles();
            setArticles(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter articles by category
    const filteredArticles = activeCategory === 'All'
        ? articles
        : articles.filter(article => {
            const tags = article.tags_en || article.tags || [];
            return tags.some(tag =>
                tag.toLowerCase().includes(activeCategory.toLowerCase())
            );
        });

    const featuredArticle = filteredArticles[0];
    const secondaryFeatured = filteredArticles.slice(1, 3);
    const recentArticles = filteredArticles.slice(3, 9);
    const moreArticles = filteredArticles.slice(9, 15);
    const trendingArticles = articles.slice(0, 5);

    if (loading) {
        return (
            <NewsLayout>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <Loader className="animate-spin text-brand-red" size={48} />
                    <p className="text-gray-500">Loading latest news...</p>
                </div>
            </NewsLayout>
        );
    }

    if (articles.length === 0) {
        return (
            <NewsLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">No Articles Yet</h2>
                    <p className="text-gray-500">Check back soon for the latest news.</p>
                </div>
            </NewsLayout>
        );
    }

    return (
        <NewsLayout>
            {/* Category Navigation */}
            <div className="mb-8 border-b border-gray-200 overflow-x-auto scrollbar-hide">
                <div className="flex gap-1 min-w-max">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-4 py-3 text-sm font-semibold uppercase tracking-wide transition whitespace-nowrap ${activeCategory === category
                                    ? 'text-brand-red border-b-2 border-brand-red'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero Section - Featured Article */}
            {featuredArticle && (
                <section className="mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Main Featured */}
                        <div className="lg:col-span-8">
                            <Link
                                to={`/article/${featuredArticle._id}`}
                                className="group block relative overflow-hidden rounded-lg shadow-lg"
                            >
                                <div className="aspect-[16/9] lg:aspect-[16/10]">
                                    <img
                                        src={featuredArticle.photos?.[0] || 'https://placehold.co/800x450?text=Featured'}
                                        alt={t(featuredArticle, 'article_header')}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                    <div className="flex items-center gap-2 mb-3">
                                        {(t(featuredArticle, 'tags') || []).slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="bg-brand-red px-2 py-1 text-xs font-bold uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                        <span className="flex items-center gap-1 text-sm text-gray-300">
                                            <Flame size={14} className="text-orange-400" />
                                            Featured
                                        </span>
                                    </div>
                                    <h2 className="font-serif font-bold text-2xl md:text-4xl leading-tight mb-3 group-hover:text-gray-200 transition">
                                        {t(featuredArticle, 'article_header')}
                                    </h2>
                                    <p className="text-gray-300 line-clamp-2 text-base hidden md:block">
                                        {t(featuredArticle, 'summary')}
                                    </p>
                                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                                        <span>{featuredArticle.author}</span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(featuredArticle.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Secondary Featured */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            {secondaryFeatured.map(article => (
                                <Link
                                    key={article._id}
                                    to={`/article/${article._id}`}
                                    className="group flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                                >
                                    <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md">
                                        <img
                                            src={article.photos?.[0] || 'https://placehold.co/100x100?text=News'}
                                            alt={t(article, 'article_header')}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-brand-red text-xs font-bold uppercase">
                                            {(t(article, 'tags') || [])[0] || 'News'}
                                        </span>
                                        <h3 className="font-serif font-bold text-gray-900 line-clamp-2 mt-1 group-hover:text-brand-red transition">
                                            {t(article, 'article_header')}
                                        </h3>
                                        <span className="text-xs text-gray-500 mt-2 block">
                                            {new Date(article.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-8">
                    {/* Latest Stories Section */}
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif font-bold text-2xl border-l-4 border-brand-red pl-3">
                                Latest Stories
                            </h2>
                            <button className="text-brand-red text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                                View All <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recentArticles.length > 0 ? (
                                recentArticles.map(article => (
                                    <NewsCard key={article._id} article={article} />
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-2">No articles in this category.</p>
                            )}
                        </div>
                    </section>

                    {/* More Stories Section */}
                    {moreArticles.length > 0 && (
                        <section>
                            <h2 className="font-serif font-bold text-2xl mb-6 border-l-4 border-gray-800 pl-3">
                                More Stories
                            </h2>

                            <div className="space-y-4">
                                {moreArticles.map(article => (
                                    <NewsCard key={article._id} article={article} variant="horizontal" />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Column */}
                <aside className="lg:col-span-4 space-y-8">
                    {/* Trending Section */}
                    <div className="bg-gray-50 p-5 rounded-lg">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-brand-red" />
                            Trending Now
                        </h3>
                        <ul className="space-y-4">
                            {trendingArticles.map((article, index) => (
                                <li key={article._id} className="flex gap-3 group">
                                    <span className="text-3xl font-bold text-gray-200 group-hover:text-brand-red transition">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <Link
                                        to={`/article/${article._id}`}
                                        className="flex-1"
                                    >
                                        <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-brand-red transition">
                                            {t(article, 'article_header')}
                                        </h4>
                                        <span className="text-xs text-gray-500 mt-1 block">
                                            {new Date(article.createdAt).toLocaleDateString()}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter Signup */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg">
                        <h3 className="font-bold text-xl mb-2">Stay Updated</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Get the latest news delivered straight to your inbox.
                        </p>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-red"
                        />
                        <button className="w-full bg-brand-red text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">
                            Subscribe Now
                        </button>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            No spam. Unsubscribe anytime.
                        </p>
                    </div>

                    {/* Categories Quick Links */}
                    <div className="bg-white border border-gray-200 p-5 rounded-lg">
                        <h3 className="font-bold text-lg mb-4">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.slice(1).map(category => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-brand-red hover:text-white transition"
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </NewsLayout>
    );
};

export default Home;


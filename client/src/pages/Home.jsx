import React, { useEffect, useState } from 'react';
import { getArticles, getTrendingArticles } from '../services/api';
import NewsLayout from '../components/layout/NewsLayout';
import NewsCard from '../components/common/NewsCard';
import { useLanguage } from '../context/LanguageContext';
import { Loader, ChevronRight, ChevronLeft, TrendingUp, Clock, Flame, Grid, LayoutList, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const { t } = useLanguage();
    const [articles, setArticles] = useState([]);
    const [trendingArticles, setTrendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState('default'); // 'default' or 'grid'

    const categories = ['All', 'Politics', 'Business', 'Tech', 'Sports', 'Entertainment'];

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const [articlesData, trendingData] = await Promise.all([
                getArticles(),
                getTrendingArticles(5)
            ]);
            setArticles(articlesData);
            setTrendingArticles(trendingData);
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

    // Reset featured index when category changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [activeCategory]);

    // Navigation functions
    const goToPrevious = () => {
        setCurrentIndex(prev => (prev === 0 ? filteredArticles.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex(prev => (prev === filteredArticles.length - 1 ? 0 : prev + 1));
    };

    const goToIndex = (index) => {
        setCurrentIndex(index);
    };

    const featuredArticle = filteredArticles[currentIndex];
    const otherArticles = filteredArticles.filter((_, idx) => idx !== currentIndex);
    const secondaryFeatured = otherArticles.slice(0, 2);
    const recentArticles = otherArticles.slice(2, 8);
    const moreArticles = otherArticles.slice(8, 14);
    
    // Latest 5 published articles for Latest Stories section (independent of category filter)
    const latestArticles = articles.slice(0, 5);

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
        <NewsLayout activeCategory={activeCategory} onCategoryChange={setActiveCategory}>
            {/* View Toggle */}
            <div className="flex justify-end mb-6">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('default')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                            viewMode === 'default'
                                ? 'bg-white text-brand-red shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <LayoutList size={18} />
                        <span className="hidden sm:inline">Default</span>
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                            viewMode === 'grid'
                                ? 'bg-white text-brand-red shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Grid size={18} />
                        <span className="hidden sm:inline">Grid</span>
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <section className="mb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredArticles.map((article) => (
                            <Link
                                key={article._id}
                                to={`/article/${article._id}`}
                                className="group block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                            >
                                <div className="aspect-[16/10] overflow-hidden">
                                    <img
                                        src={article.photos?.[0] || 'https://placehold.co/400x250?text=News'}
                                        alt={t(article, 'article_header')}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    />
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-brand-red text-xs font-bold uppercase">
                                            {(t(article, 'tags') || [])[0] || 'News'}
                                        </span>
                                    </div>
                                    <h3 className="font-serif font-bold text-gray-900 line-clamp-2 group-hover:text-brand-red transition">
                                        {t(article, 'article_header')}
                                    </h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mt-2">
                                        {t(article, 'summary')}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                                        <span>{article.author}</span>
                                        <span>•</span>
                                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Default View */}
            {viewMode === 'default' && (
                <>
            {/* Hero Section - Featured Article with Navigation */}
            {featuredArticle && (
                <section className="mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Main Featured with External Navigation */}
                        <div className="lg:col-span-8">
                            <div className="flex items-center gap-3">
                                {/* Left Arrow - Outside */}
                                {filteredArticles.length > 1 && (
                                    <button
                                        onClick={goToPrevious}
                                        className="hidden md:flex flex-shrink-0 bg-gray-100 hover:bg-brand-red hover:text-white text-gray-600 p-3 rounded-full shadow-md transition"
                                        aria-label="Previous article"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                                
                                {/* Article Card */}
                                <div className="flex-1 relative">
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
                                        
                                        {/* Article Counter */}
                                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                            {currentIndex + 1} / {filteredArticles.length}
                                        </div>
                                    </Link>
                                </div>
                                
                                {/* Right Arrow - Outside */}
                                {filteredArticles.length > 1 && (
                                    <button
                                        onClick={goToNext}
                                        className="hidden md:flex flex-shrink-0 bg-gray-100 hover:bg-brand-red hover:text-white text-gray-600 p-3 rounded-full shadow-md transition"
                                        aria-label="Next article"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                )}
                            </div>
                            
                            {/* Mobile Navigation Arrows */}
                            {filteredArticles.length > 1 && (
                                <div className="flex md:hidden justify-center gap-4 mt-4">
                                    <button
                                        onClick={goToPrevious}
                                        className="bg-gray-100 hover:bg-brand-red hover:text-white text-gray-600 p-2 rounded-full shadow-md transition"
                                        aria-label="Previous article"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={goToNext}
                                        className="bg-gray-100 hover:bg-brand-red hover:text-white text-gray-600 p-2 rounded-full shadow-md transition"
                                        aria-label="Next article"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                            
                            {/* Pagination Dots */}
                            {filteredArticles.length > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    {filteredArticles.slice(0, Math.min(filteredArticles.length, 10)).map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToIndex(index)}
                                            className={`w-2.5 h-2.5 rounded-full transition ${
                                                index === currentIndex
                                                    ? 'bg-brand-red w-6'
                                                    : 'bg-gray-300 hover:bg-gray-400'
                                            }`}
                                            aria-label={`Go to article ${index + 1}`}
                                        />
                                    ))}
                                    {filteredArticles.length > 10 && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            +{filteredArticles.length - 10} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Secondary Articles */}
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
                    {/* Latest Stories Section - Latest 5 Articles in Grid */}
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif font-bold text-2xl border-l-4 border-brand-red pl-3">
                                Latest Stories
                            </h2>
                            <button className="text-brand-red text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                                View All <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-5">
                            {latestArticles.length > 0 ? (
                                latestArticles.map((article) => (
                                    <Link
                                        key={article._id}
                                        to={`/article/${article._id}`}
                                        className="group block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition w-full"
                                    >
                                        <div className="aspect-[4/3] overflow-hidden">
                                            <img
                                                src={article.photos?.[0] || 'https://placehold.co/400x300?text=News'}
                                                alt={t(article, 'article_header')}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-brand-red text-xs font-bold uppercase">
                                                    {(t(article, 'tags') || [])[0] || 'News'}
                                                </span>
                                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                                    <Eye size={12} />
                                                    {article.views || 0}
                                                </span>
                                            </div>
                                            <h3 className="font-serif font-bold text-gray-900 group-hover:text-brand-red transition text-base line-clamp-2">
                                                {t(article, 'article_header')}
                                            </h3>
                                            <p className="text-gray-500 mt-2 line-clamp-2 text-sm">
                                                {t(article, 'summary')}
                                            </p>
                                            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                                                <span>{article.author}</span>
                                                <span>•</span>
                                                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-3 text-center py-8">No articles published yet.</p>
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
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} />
                                                {article.views || 0} views
                                            </span>
                                            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                        </div>
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
                </>
            )}
        </NewsLayout>
    );
};

export default Home;


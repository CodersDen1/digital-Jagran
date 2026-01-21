import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';

/**
 * NewsCard Component
 * Supports multiple variants: 'default', 'featured', 'horizontal', 'compact'
 */
const NewsCard = ({ article, variant = 'default', featured = false }) => {
    const { t } = useLanguage();

    if (!article) return null;

    // Skeleton Loader for Translating State
    if (article.isTranslating) {
        return (
            <div className="animate-pulse bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 h-full p-4">
                <div className="bg-gray-200 h-48 w-full rounded-md mb-4"></div>
                <div className="bg-gray-200 h-6 w-3/4 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 w-1/2 rounded mb-4"></div>
                <div className="bg-gray-200 h-4 w-full rounded"></div>
            </div>
        );
    }

    const header = t(article, 'article_header');
    const summary = t(article, 'summary');
    const tags = t(article, 'tags') || [];
    const image = article.photos && article.photos.length > 0
        ? article.photos[0]
        : 'https://placehold.co/600x400?text=News';

    // Handle legacy 'featured' prop
    if (featured) variant = 'featured';

    // Horizontal variant - image on left, text on right
    if (variant === 'horizontal') {
        return (
            <Link
                to={`/article/${article._id}`}
                title={header}
                className="group flex gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:shadow-md transition"
            >
                <div className="w-32 h-24 flex-shrink-0 overflow-hidden rounded-md">
                    <img
                        src={image}
                        alt={header}
                        title={header}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                    />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {tags[0] && (
                        <span className="text-brand-red font-bold uppercase text-xs tracking-wider mb-1">
                            {tags[0]}
                        </span>
                    )}
                    <h3 className="font-serif font-bold text-gray-900 line-clamp-2 group-hover:text-brand-red transition">
                        {header}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                            <User size={12} />
                            {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(article.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </Link>
        );
    }

    // Featured variant - larger with overlay
    if (variant === 'featured') {
        return (
            <Link
                to={`/article/${article._id}`}
                title={header}
                className="group block md:grid md:grid-cols-2 md:gap-8 h-full"
            >
                <div className="overflow-hidden rounded-lg relative h-64 md:h-full">
                    <img
                        src={image}
                        alt={header}
                        title={header}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {tags[0] && (
                        <span className="absolute top-4 left-4 bg-brand-red text-white text-xs font-bold px-3 py-1 uppercase rounded">
                            {tags[0]}
                        </span>
                    )}
                </div>

                <div className="flex flex-col justify-center py-4 md:py-0">
                    <h3 className="font-serif font-bold text-gray-900 leading-tight group-hover:text-brand-red transition text-2xl md:text-3xl mb-4">
                        {header}
                    </h3>

                    <p className="text-gray-600 mb-4 line-clamp-3 text-base">
                        {summary}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <User size={14} />
                                {article.author}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(article.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <span className="text-brand-red font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                            Read More <ArrowRight size={16} />
                        </span>
                    </div>
                </div>
            </Link>
        );
    }

    // Compact variant - minimal design
    if (variant === 'compact') {
        return (
            <Link
                to={`/article/${article._id}`}
                title={header}
                className="group block py-3 border-b border-gray-100 last:border-0"
            >
                <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-brand-red transition">
                    {header}
                </h4>
                <span className="text-xs text-gray-500 mt-1 block">
                    {new Date(article.createdAt).toLocaleDateString()}
                </span>
            </Link>
        );
    }

    // Default variant - standard card
    return (
        <Link
            to={`/article/${article._id}`}
            title={header}
            className="group block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full"
        >
            <div className="aspect-video overflow-hidden relative">
                <img
                    src={image}
                    alt={header}
                    title={header}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                {tags[0] && (
                    <span className="absolute top-3 left-3 bg-brand-red text-white text-xs font-bold px-2 py-1 uppercase">
                        {tags[0]}
                    </span>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-serif font-bold text-gray-900 leading-tight group-hover:text-brand-red transition text-lg mb-2 line-clamp-2">
                    {header}
                </h3>

                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {summary}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    <span>{article.author}</span>
                </div>
            </div>
        </Link>
    );
};

export default NewsCard;


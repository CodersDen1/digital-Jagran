import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import ElementRenderers from './ElementRenderers';

/**
 * DynamicArticleRenderer - Renders article content based on layout template
 * If no layout is provided, renders using the default static layout
 */
const DynamicArticleRenderer = ({ article, layout }) => {
    const { t } = useLanguage();

    // If no layout, render with default static layout
    if (!layout || !layout.elements || layout.elements.length === 0) {
        return <DefaultArticleLayout article={article} t={t} />;
    }

    // Sort elements by row for proper rendering order
    const sortedElements = [...layout.elements].sort((a, b) => a.row - b.row);

    // Generate CSS classes from config
    const getConfigStyles = (config) => {
        const classes = [];

        if (config.fontSize) classes.push(`text-${config.fontSize}`);
        if (config.fontWeight) classes.push(`font-${config.fontWeight}`);
        if (config.fontFamily) classes.push(`font-${config.fontFamily}`);
        if (config.textAlign) classes.push(`text-${config.textAlign}`);
        if (config.textColor) classes.push(`text-${config.textColor}`);
        if (config.lineHeight && config.lineHeight !== 'normal') {
            classes.push(`leading-${config.lineHeight}`);
        }
        if (config.paddingTop && config.paddingTop !== '0') classes.push(`pt-${config.paddingTop}`);
        if (config.paddingBottom && config.paddingBottom !== '0') classes.push(`pb-${config.paddingBottom}`);
        if (config.paddingLeft && config.paddingLeft !== '0') classes.push(`pl-${config.paddingLeft}`);
        if (config.paddingRight && config.paddingRight !== '0') classes.push(`pr-${config.paddingRight}`);
        if (config.marginTop && config.marginTop !== '0') classes.push(`mt-${config.marginTop}`);
        if (config.marginBottom && config.marginBottom !== '0') classes.push(`mb-${config.marginBottom}`);
        if (config.backgroundColor && config.backgroundColor !== 'transparent') {
            classes.push(`bg-${config.backgroundColor}`);
        }
        if (config.borderRadius && config.borderRadius !== 'none') {
            classes.push(`rounded-${config.borderRadius}`);
        }
        // Border left (only when explicitly enabled)
        if (config.borderLeft) {
            classes.push(`border-l-4 border-${config.borderColor || 'gray-300'}`);
        }
        // Max height with overflow handling
        if (config.maxHeight) {
            classes.push(`max-h-${config.maxHeight}`);
            classes.push('overflow-hidden');
        }

        return classes.join(' ');
    };


    // Filter root elements (those without a parent)
    const rootElements = sortedElements.filter(el => !el.parentId);

    return (
        <div
            className={`grid grid-cols-12 gap-${layout.gridGap || '4'} max-w-${layout.maxWidth || '4xl'} mx-auto`}
        >
            {rootElements.map((element) => {
                const configStyles = getConfigStyles(element.config);

                // Handle nested sections
                if (element.type === 'section') {
                    // Find children of this section
                    const children = sortedElements.filter(el => el.parentId === element.id);
                    const columns = element.config.columns || 2;

                    return (
                        <div
                            key={element.id}
                            style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                            className={`${!element.config.showOnMobile ? 'hidden md:block' : ''} ${!element.config.showOnDesktop ? 'md:hidden' : ''}`}
                        >
                            <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
                                {Array.from({ length: columns }, (_, i) => i).map(colIndex => {
                                    const colElements = children
                                        .filter(child => child.column === colIndex)
                                        .sort((a, b) => a.row - b.row || a.order - b.order);

                                    return (
                                        <div key={colIndex} className="flex flex-col gap-4">
                                            {colElements.map(child => (
                                                <div key={child.id} className={getConfigStyles(child.config)}>
                                                    <ElementRenderers
                                                        type={child.type}
                                                        elementId={child.id}
                                                        config={child.config}
                                                        article={article}
                                                        t={t}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // Regular Top-Level Element
                return (
                    <div
                        key={element.id}
                        style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                        className={`${!element.config.showOnMobile ? 'hidden md:block' : ''} ${!element.config.showOnDesktop ? 'md:hidden' : ''}`}
                    >
                        <div className={configStyles}>
                            <ElementRenderers
                                type={element.type}
                                elementId={element.id}
                                config={element.config}
                                article={article}
                                t={t}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );

};

/**
 * Default article layout when no custom layout is assigned
 */
const DefaultArticleLayout = ({ article, t }) => {
    const tags = t(article, 'tags') || [];
    const image = article.photos && article.photos.length > 0 ? article.photos[0] : null;

    return (
        <article className="max-w-4xl mx-auto">
            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex gap-2 mb-4">
                    {tags.map((tag, idx) => (
                        <span key={idx} className="text-brand-red font-bold uppercase text-xs tracking-wider">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-4">
                {t(article, 'article_header')}
            </h1>

            {/* Summary */}
            <p className="text-xl text-gray-600 leading-relaxed italic border-l-4 border-gray-300 pl-4 mb-6">
                {t(article, 'summary')}
            </p>

            {/* Author and Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-b border-gray-100 py-4 gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                        {article.author?.charAt(0) || 'A'}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-gray-900">{article.author}</div>
                        <div className="text-xs text-gray-500">
                            {new Date(article.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Image */}
            {image && (
                <figure className="mb-8">
                    <img
                        src={image}
                        alt={t(article, 'article_header')}
                        className="w-full h-auto rounded-md object-cover"
                    />
                </figure>
            )}

            {/* Video */}
            {article.video && (
                <div className="mb-8 aspect-video">
                    <iframe
                        className="w-full h-full rounded-md"
                        src={article.video.replace('watch?v=', 'embed/')}
                        title="Video"
                        allowFullScreen
                    />
                </div>
            )}

            {/* Body */}
            <div className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-brand-red hover:prose-a:text-red-800">
                <div className="whitespace-pre-wrap font-serif text-gray-800 leading-relaxed text-lg">
                    {t(article, 'body')}
                </div>
            </div>
        </article>
    );
};

export default DynamicArticleRenderer;

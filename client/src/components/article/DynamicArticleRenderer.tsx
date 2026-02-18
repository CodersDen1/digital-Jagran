/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import ElementRenderers from './ElementRenderers';
import FreeformArticleRenderer from './FreeformArticleRenderer';
import { User } from 'lucide-react';

interface DynamicArticleRendererProps {
    article: any;
    layout: any;
}

/**
 * DynamicArticleRenderer - Renders article content based on layout template
 * Supports both grid-based layouts and freeform layouts with absolute positioning
 */
const DynamicArticleRenderer = ({ article, layout }: DynamicArticleRendererProps) => {
    const { t } = useLanguage();

    // If no layout, render with default static layout
    if (!layout || !layout.elements || layout.elements.length === 0) {
        return <DefaultArticleLayout article={article} t={t} />;
    }

    // Check if this is a freeform layout (has canvas property or layoutType)
    const isFreeformLayout = layout.canvas || layout.layoutType === 'freeform';

    if (isFreeformLayout) {
        return <FreeformArticleRenderer article={article} layout={layout} />;
    }

    // Sort elements by row for proper rendering order
    const sortedElements = [...layout.elements].sort((a: any, b: any) => a.row - b.row);

    // Convert config to inline styles instead of dynamic Tailwind classes
    // Dynamic classes like `text-${val}` get purged in production builds
    const getConfigInlineStyles = (config: any): React.CSSProperties => {
        const styles: React.CSSProperties = {};

        const FONT_SIZE_MAP: Record<string, string> = {
            'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem',
            'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem'
        };
        const FONT_WEIGHT_MAP: Record<string, number> = {
            'light': 300, 'normal': 400, 'medium': 500, 'semibold': 600, 'bold': 700
        };
        const SPACING_MAP: Record<string, string> = {
            '0': '0px', '1': '0.25rem', '2': '0.5rem', '3': '0.75rem', '4': '1rem',
            '6': '1.5rem', '8': '2rem', '10': '2.5rem', '12': '3rem', '16': '4rem'
        };
        const LINE_HEIGHT_MAP: Record<string, number> = {
            'tight': 1.25, 'normal': 1.5, 'relaxed': 1.625, 'loose': 2
        };
        const BORDER_RADIUS_MAP: Record<string, string> = {
            'sm': '0.125rem', 'md': '0.375rem', 'lg': '0.5rem', 'xl': '0.75rem', '2xl': '1rem', 'full': '9999px'
        };

        if (config.fontSize && FONT_SIZE_MAP[config.fontSize]) styles.fontSize = FONT_SIZE_MAP[config.fontSize];
        if (config.fontWeight && FONT_WEIGHT_MAP[config.fontWeight]) styles.fontWeight = FONT_WEIGHT_MAP[config.fontWeight];
        if (config.fontFamily) {
            const families: Record<string, string> = {
                'serif': 'ui-serif, Georgia, serif',
                'sans': 'ui-sans-serif, system-ui, sans-serif',
                'mono': 'ui-monospace, monospace'
            };
            if (families[config.fontFamily]) styles.fontFamily = families[config.fontFamily];
        }
        if (config.textAlign) styles.textAlign = config.textAlign as any;
        if (config.textColor) styles.color = config.textColor;
        if (config.lineHeight && LINE_HEIGHT_MAP[config.lineHeight]) styles.lineHeight = LINE_HEIGHT_MAP[config.lineHeight];

        if (config.paddingTop && config.paddingTop !== '0' && SPACING_MAP[config.paddingTop]) styles.paddingTop = SPACING_MAP[config.paddingTop];
        if (config.paddingBottom && config.paddingBottom !== '0' && SPACING_MAP[config.paddingBottom]) styles.paddingBottom = SPACING_MAP[config.paddingBottom];
        if (config.paddingLeft && config.paddingLeft !== '0' && SPACING_MAP[config.paddingLeft]) styles.paddingLeft = SPACING_MAP[config.paddingLeft];
        if (config.paddingRight && config.paddingRight !== '0' && SPACING_MAP[config.paddingRight]) styles.paddingRight = SPACING_MAP[config.paddingRight];
        if (config.marginTop && config.marginTop !== '0' && SPACING_MAP[config.marginTop]) styles.marginTop = SPACING_MAP[config.marginTop];
        if (config.marginBottom && config.marginBottom !== '0' && SPACING_MAP[config.marginBottom]) styles.marginBottom = SPACING_MAP[config.marginBottom];

        if (config.backgroundColor && config.backgroundColor !== 'transparent') {
            styles.backgroundColor = config.backgroundColor;
        }
        if (config.borderRadius && config.borderRadius !== 'none' && BORDER_RADIUS_MAP[config.borderRadius]) {
            styles.borderRadius = BORDER_RADIUS_MAP[config.borderRadius];
        }
        if (config.borderLeft) {
            styles.borderLeft = `4px solid ${config.borderColor || '#d1d5db'}`;
        }
        if (config.maxHeight) {
            styles.maxHeight = SPACING_MAP[config.maxHeight] || `${parseInt(config.maxHeight) * 4}px`;
            styles.overflow = 'hidden';
        }

        return styles;
    };

    // Filter root elements (those without a parent)
    const rootElements = sortedElements.filter((el: any) => !el.parentId);

    // Map gap values to pixels for inline styles
    const GAP_MAP: Record<string, string> = {
        '0': '0px', '1': '4px', '2': '8px', '3': '12px', '4': '16px',
        '5': '20px', '6': '24px', '8': '32px', '10': '40px', '12': '48px'
    };
    const MAX_WIDTH_MAP: Record<string, string> = {
        'sm': '640px', 'md': '768px', 'lg': '1024px', 'xl': '1280px',
        '2xl': '1536px', '3xl': '1600px', '4xl': '896px', '5xl': '1024px',
        '6xl': '1152px', '7xl': '1280px'
    };

    const gridGapValue = GAP_MAP[layout.gridGap] || GAP_MAP['4'];
    const maxWidthValue = MAX_WIDTH_MAP[layout.maxWidth] || MAX_WIDTH_MAP['4xl'];

    return (
        <div
            className="grid grid-cols-12 mx-auto"
            style={{ gap: gridGapValue, maxWidth: maxWidthValue }}
        >
            {rootElements.map((element: any) => {
                const configInlineStyles = getConfigInlineStyles(element.config);

                // Handle nested sections
                if (element.type === 'section') {
                    // Find children of this section
                    const children = sortedElements.filter((el: any) => el.parentId === element.id);
                    const columns = element.config.columns || 2;

                    return (
                        <div
                            key={element.id}
                            style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                            className={`${!element.config.showOnMobile ? 'hidden md:block' : ''} ${!element.config.showOnDesktop ? 'md:hidden' : ''}`}
                        >
                            <div className="grid grid-cols-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '16px' }}>
                                {Array.from({ length: columns }, (_, i) => i).map(colIndex => {
                                    const colElements = children
                                        .filter((child: any) => child.column === colIndex)
                                        .sort((a: any, b: any) => a.row - b.row || a.order - b.order);

                                    return (
                                        <div key={colIndex} className="flex flex-col gap-4">
                                            {colElements.map((child: any) => (
                                                <div key={child.id} style={getConfigInlineStyles(child.config)}>
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
                        <div style={configInlineStyles}>
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
const DefaultArticleLayout = ({ article, t }: any) => {
    const tags = t(article, 'tags') || [];
    const image = article.photos && article.photos.length > 0 ? article.photos[0] : null;

    return (
        <article className="max-w-4xl mx-auto">
            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex gap-2 mb-4">
                    {tags.map((tag: string, idx: number) => (
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
                        {article.author?.charAt(0) || <User size={20} />}
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

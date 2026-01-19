import React from 'react';
import LayoutElement from './LayoutElement';

/**
 * Sample article data for preview mode
 */
const SAMPLE_ARTICLE = {
    article_header_en: 'Breaking: Major Policy Changes Announced by Government',
    summary_en: 'The government has announced sweeping policy changes that will affect millions of citizens. Officials say the changes are aimed at improving economic conditions and reducing bureaucracy.',
    body_en: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor.

Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor. Suspendisse dictum feugiat nisl ut dapibus. Mauris iaculis porttitor posuere.

Praesent id metus massa, ut blandit odio. Proin quis tortor orci. Etiam at risus et justo dignissim congue. Donec congue lacinia dui, a porttitor lectus condimentum laoreet.`,
    author: 'Nisha Mishra',
    createdAt: new Date().toISOString(),
    tags_en: ['Politics', 'Economy', 'Breaking News'],
    photos: ['https://placehold.co/800x450?text=Featured+Image']
};

/**
 * LayoutCanvas - The main canvas area where elements are displayed
 * Renders elements in a 12-column grid system
 */
const LayoutCanvas = ({
    elements,
    selectedElementId,
    onSelectElement,
    onUpdateElement,
    onDeleteElement,
    onMoveUp,
    onMoveDown,
    gridGap,
    maxWidth,
    previewMode
}) => {
    // Sort elements by row for proper display order
    const sortedElements = [...elements].sort((a, b) => a.row - b.row);

    // Get element content based on type
    const getElementContent = (element) => {
        const { type, config } = element;

        switch (type) {
            case 'header':
                return SAMPLE_ARTICLE.article_header_en;

            case 'summary':
                return SAMPLE_ARTICLE.summary_en;

            case 'body':
                return SAMPLE_ARTICLE.body_en;

            case 'author':
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            {SAMPLE_ARTICLE.author.charAt(0)}
                        </div>
                        <span>{SAMPLE_ARTICLE.author}</span>
                    </div>
                );

            case 'date':
                return new Date(SAMPLE_ARTICLE.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

            case 'tags':
                return (
                    <div className="flex flex-wrap gap-2">
                        {SAMPLE_ARTICLE.tags_en.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                );

            case 'image':
                return (
                    <img
                        src={SAMPLE_ARTICLE.photos[0]}
                        alt="Featured"
                        className="w-full h-full object-cover"
                        style={{
                            aspectRatio: config.aspectRatio || '16/9',
                            objectFit: config.objectFit || 'cover'
                        }}
                    />
                );

            case 'video':
                return (
                    <div
                        className="bg-gray-900 flex items-center justify-center text-white"
                        style={{ aspectRatio: config.aspectRatio || '16/9' }}
                    >
                        <span className="text-lg">▶ Video Player</span>
                    </div>
                );

            case 'text':
                return config.customContent || 'Custom text content...';

            case 'divider':
                return (
                    <hr className={`border-t border-${config.borderColor || 'gray-200'}`} />
                );

            case 'spacer':
                return <div className="h-8"></div>;

            default:
                return `[${type}]`;
        }
    };

    // Generate CSS classes from config
    const getConfigStyles = (config) => {
        const classes = [];

        // Font size
        if (config.fontSize) classes.push(`text-${config.fontSize}`);

        // Font weight
        if (config.fontWeight) classes.push(`font-${config.fontWeight}`);

        // Font family
        if (config.fontFamily) classes.push(`font-${config.fontFamily}`);

        // Text align
        if (config.textAlign) classes.push(`text-${config.textAlign}`);

        // Text color
        if (config.textColor) classes.push(`text-${config.textColor}`);

        // Line height
        if (config.lineHeight && config.lineHeight !== 'normal') {
            classes.push(`leading-${config.lineHeight}`);
        }

        // Padding
        if (config.paddingTop && config.paddingTop !== '0') classes.push(`pt-${config.paddingTop}`);
        if (config.paddingBottom && config.paddingBottom !== '0') classes.push(`pb-${config.paddingBottom}`);
        if (config.paddingLeft && config.paddingLeft !== '0') classes.push(`pl-${config.paddingLeft}`);
        if (config.paddingRight && config.paddingRight !== '0') classes.push(`pr-${config.paddingRight}`);

        // Margin
        if (config.marginTop && config.marginTop !== '0') classes.push(`mt-${config.marginTop}`);
        if (config.marginBottom && config.marginBottom !== '0') classes.push(`mb-${config.marginBottom}`);

        // Background
        if (config.backgroundColor && config.backgroundColor !== 'transparent') {
            classes.push(`bg-${config.backgroundColor}`);
        }

        // Border radius
        if (config.borderRadius && config.borderRadius !== 'none') {
            classes.push(`rounded-${config.borderRadius}`);
        }

        // Border
        if (config.borderWidth && config.borderWidth !== '0') {
            classes.push(`border-${config.borderWidth}`);
            classes.push(`border-${config.borderColor || 'gray-200'}`);
        }

        // Border left (for summary style)
        if (config.paddingLeft && config.borderColor) {
            classes.push(`border-l-4`);
        }

        return classes.join(' ');
    };

    return (
        <div className={`mx-auto bg-white shadow-lg rounded-lg p-8 max-w-${maxWidth}`}>
            <div className={`grid grid-cols-12 gap-${gridGap}`}>
                {sortedElements.map((element, index) => {
                    const isSelected = element.id === selectedElementId;
                    const content = getElementContent(element);
                    const configStyles = getConfigStyles(element.config);

                    return (
                        <LayoutElement
                            key={element.id}
                            element={element}
                            isSelected={isSelected}
                            previewMode={previewMode}
                            onSelect={() => onSelectElement(element.id)}
                            onUpdate={(updates) => onUpdateElement(element.id, updates)}
                            onDelete={() => onDeleteElement(element.id)}
                            onMoveUp={() => onMoveUp(element.id)}
                            onMoveDown={() => onMoveDown(element.id)}
                            isFirst={index === 0}
                            isLast={index === sortedElements.length - 1}
                        >
                            <div className={configStyles}>
                                {content}
                            </div>
                        </LayoutElement>
                    );
                })}
            </div>

            {elements.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">No elements added yet</p>
                    <p className="text-sm mt-2">Click on elements in the left toolbar to add them</p>
                </div>
            )}
        </div>
    );
};

export default LayoutCanvas;

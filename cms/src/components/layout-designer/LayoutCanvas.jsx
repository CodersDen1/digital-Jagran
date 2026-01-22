import React from 'react';
import LayoutElement from './LayoutElement';
import LayoutSection from './LayoutSection';

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
    onReorder,
    onMoveToContainer,
    onAddElementToContainer,
    gridGap,
    maxWidth,
    previewMode
}) => {
    // Only render root elements (no parentId)
    const rootElements = elements.filter(el => !el.parentId).sort((a, b) => a.row - b.row);

    // Get element content based on type (Shared logic needed?)
    const getElementContent = (element) => {
        const { type, config } = element;
        // Import LayoutSection locally if possible or handle here
        if (type === 'section') {
            return (
                <LayoutSection
                    sectionElement={element}
                    allElements={elements}
                    previewMode={previewMode}
                    onSelectElement={onSelectElement}
                    onUpdateElement={onUpdateElement}
                    onDeleteElement={onDeleteElement}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onReorder={onReorder}
                    onMoveToContainer={onMoveToContainer}
                    onAddElementToContainer={onAddElementToContainer}
                    selectedElementId={selectedElementId}
                />
            );
        }

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
                const videoUrl = config.videoUrl || '';
                const isIframe = videoUrl.includes('<iframe');
                const isVideoFile = videoUrl.match(/\.(mp4|webm|ogg)$/i);

                return (
                    <div
                        className="bg-black flex items-center justify-center text-white overflow-hidden relative"
                        style={{ aspectRatio: config.aspectRatio || '16/9', borderRadius: config.borderRadius !== 'none' ? '0.375rem' : '0' }}
                    >
                        {!videoUrl ? (
                            <div className="flex flex-col items-center opacity-50">
                                <span className="text-4xl mb-2">▶</span>
                                <span className="text-sm">Add Video URL</span>
                            </div>
                        ) : isIframe ? (
                            <div
                                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                                dangerouslySetInnerHTML={{ __html: videoUrl }}
                            />
                        ) : isVideoFile ? (
                            <video
                                src={videoUrl}
                                controls
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            // Assume generic URL is an iframe source (Cloudflare/YouTube)
                            <iframe
                                src={videoUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
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
        if (!config) return '';
        const classes = [];
        // ... (Keep existing logic if preferred, or rely on existing function)
        // For brevity preserving existing logic by reference or assuming untouched
        // RE-IMPLEMENTING for safety in replacement
        if (config.fontSize) classes.push(`text-${config.fontSize}`);
        if (config.fontWeight) classes.push(`font-${config.fontWeight}`);
        if (config.fontFamily) classes.push(`font-${config.fontFamily}`);
        if (config.textAlign) classes.push(`text-${config.textAlign}`);
        if (config.textColor) classes.push(`text-${config.textColor}`);
        if (config.lineHeight && config.lineHeight !== 'normal') classes.push(`leading-${config.lineHeight}`);
        if (config.paddingTop && config.paddingTop !== '0') classes.push(`pt-${config.paddingTop}`);
        if (config.paddingBottom && config.paddingBottom !== '0') classes.push(`pb-${config.paddingBottom}`);
        if (config.paddingLeft && config.paddingLeft !== '0') classes.push(`pl-${config.paddingLeft}`);
        if (config.paddingRight && config.paddingRight !== '0') classes.push(`pr-${config.paddingRight}`);
        if (config.marginTop && config.marginTop !== '0') classes.push(`mt-${config.marginTop}`);
        if (config.marginBottom && config.marginBottom !== '0') classes.push(`mb-${config.marginBottom}`);
        if (config.backgroundColor && config.backgroundColor !== 'transparent') classes.push(`bg-${config.backgroundColor}`);
        if (config.borderRadius && config.borderRadius !== 'none') classes.push(`rounded-${config.borderRadius}`);
        if (config.borderWidth && config.borderWidth !== '0') {
            classes.push(`border-${config.borderWidth}`);
            classes.push(`border-${config.borderColor || 'gray-200'}`);
        }
        if (config.borderLeft) {
            classes.push(`border-l-4`);
            classes.push(`border-${config.borderColor || 'gray-300'}`);
        }
        if (config.maxHeight) {
            classes.push(`max-h-${config.maxHeight}`);
            classes.push('overflow-hidden');
        }
        return classes.join(' ');
    };

    return (
        <div className={`mx-auto bg-white shadow-lg rounded-lg p-8 max-w-${maxWidth}`}>
            <div className={`grid grid-cols-12 gap-${gridGap}`}>
                {rootElements.map((element, index) => {
                    const isSelected = element.id === selectedElementId;
                    const content = getElementContent(element);
                    const configStyles = getConfigStyles(element.config);

                    // Root elements span their full width
                    // Sections handle their own grid

                    if (element.type === 'section') {
                        return (
                            <LayoutElement
                                key={element.id}
                                element={element}
                                index={index}
                                isSelected={isSelected}
                                previewMode={previewMode}
                                onSelect={() => onSelectElement(element.id)}
                                onUpdate={(updates) => onUpdateElement(element.id, updates)}
                                onDelete={() => onDeleteElement(element.id)}
                                onMoveUp={() => onMoveUp(element.id)}
                                onMoveDown={() => onMoveDown(element.id)}
                                onReorder={onReorder}
                                isFirst={index === 0}
                                isLast={index === rootElements.length - 1}
                            >
                                {content}
                            </LayoutElement>
                        );
                    }

                    return (
                        <LayoutElement
                            key={element.id}
                            element={element}
                            index={index}
                            isSelected={isSelected}
                            previewMode={previewMode}
                            onSelect={() => onSelectElement(element.id)}
                            onUpdate={(updates) => onUpdateElement(element.id, updates)}
                            onDelete={() => onDeleteElement(element.id)}
                            onMoveUp={() => onMoveUp(element.id)}
                            onMoveDown={() => onMoveDown(element.id)}
                            onReorder={onReorder}
                            isFirst={index === 0}
                            isLast={index === rootElements.length - 1}
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

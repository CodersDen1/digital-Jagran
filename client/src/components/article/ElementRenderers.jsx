import React, { useRef, useEffect } from 'react';
import { User, Calendar, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';

/**
 * Helper function to get element-specific content or fall back to article field
 */
const getElementContent = (article, elementId, fieldName, t) => {
    // Check for element-specific content first (using language-aware lookup)
    let elementContent = t(article, 'elementContent');

    // If elementContent is an empty object (Mongoose default), try fallback to en
    // This handles the case where content is saved in elementContent_en but t() returns empty elementContent
    if (elementContent && typeof elementContent === 'object' && !Array.isArray(elementContent) && Object.keys(elementContent).length === 0) {
        elementContent = article.elementContent_en;
    }

    // Explicit fallback to English map if still missing/empty
    elementContent = elementContent || article.elementContent_en;

    if (elementContent && elementId) {
        // Handle both Map and plain object
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];

        if (content) {
            if (typeof content === 'string') return content;
            if (content.value) return content.value;
        }
    }
    // Fall back to standard article field
    return t(article, fieldName);
};

/**
 * ElementRenderers - Renders different element types for the dynamic layout
 */
const ElementRenderers = ({ type, elementId, config, article, t }) => {
    switch (type) {
        case 'header':
            return <HeaderRenderer article={article} elementId={elementId} t={t} config={config} />;
        case 'summary':
            return <SummaryRenderer article={article} elementId={elementId} t={t} config={config} />;
        case 'body':
            return <BodyRenderer article={article} elementId={elementId} t={t} config={config} />;
        case 'image':
            return <ImageRenderer article={article} elementId={elementId} t={t} config={config} />;
        case 'video':
            return <VideoRenderer article={article} elementId={elementId} config={config} />;
        case 'author':
            return <AuthorRenderer article={article} />;
        case 'date':
            return <DateRenderer article={article} />;
        case 'tags':
            return <TagsRenderer article={article} elementId={elementId} t={t} />;
        case 'text':
            return <TextRenderer config={config} />;
        case 'divider':
            return <DividerRenderer config={config} />;
        case 'spacer':
            return <SpacerRenderer config={config} />;
        default:
            return <div className="text-gray-400">[Unknown element: {type}]</div>;
    }
};

/**
 * Helper to generate Tailwind classes from config
 */
/**
 * Helper to get Tailwind classes from config using explicit maps
 * (Dynamic string interpolation like `text-${size}` often fails with Tailwind JIT)
 */
const FONT_SIZES = {
    'xs': 'text-xs', 'sm': 'text-sm', 'base': 'text-base', 'lg': 'text-lg',
    'xl': 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '5xl': 'text-5xl'
};
const FONT_WEIGHTS = {
    'light': 'font-light', 'normal': 'font-normal', 'medium': 'font-medium',
    'semibold': 'font-semibold', 'bold': 'font-bold'
};
const TEXT_ALIGNS = {
    'left': 'text-left', 'center': 'text-center', 'right': 'text-right', 'justify': 'text-justify'
};
const FONT_FAMILIES = {
    'serif': 'font-serif', 'sans': 'font-sans'
};

const getConfigClasses = (config, defaultSize = 'base') => {
    if (!config) return '';
    const classes = [];

    // Typography
    if (config.fontSize && FONT_SIZES[config.fontSize]) {
        classes.push(FONT_SIZES[config.fontSize]);
    } else {
        classes.push(FONT_SIZES[defaultSize] || `text-${defaultSize}`);
    }

    if (config.fontWeight && FONT_WEIGHTS[config.fontWeight]) classes.push(FONT_WEIGHTS[config.fontWeight]);
    if (config.fontFamily && FONT_FAMILIES[config.fontFamily]) classes.push(FONT_FAMILIES[config.fontFamily]);
    if (config.textAlign && TEXT_ALIGNS[config.textAlign]) classes.push(TEXT_ALIGNS[config.textAlign]);

    // Text Color
    const TEXT_COLORS = {
        'gray-900': 'text-gray-900', 'gray-700': 'text-gray-700', 'gray-600': 'text-gray-600',
        'gray-500': 'text-gray-500', 'brand-red': 'text-brand-red', 'white': 'text-white',
        'red-500': 'text-red-500', 'blue-500': 'text-blue-500'
    };
    if (config.textColor) {
        if (TEXT_COLORS[config.textColor]) classes.push(TEXT_COLORS[config.textColor]);
        else classes.push(config.textColor.startsWith('text-') ? config.textColor : `text-${config.textColor}`);
    }

    // Spacing (dynamic usually fine for numbers or safelisted keys)
    const SPACING_MAP = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '6': '6', '8': '8', '10': '10', '12': '12', '16': '16'
    };

    const addSpacing = (prop, prefix) => {
        if (config[prop] && SPACING_MAP[config[prop]]) {
            classes.push(`${prefix}-${config[prop]}`);
        }
    };

    addSpacing('marginTop', 'mt');
    addSpacing('marginBottom', 'mb');
    addSpacing('paddingTop', 'pt');
    addSpacing('paddingBottom', 'pb');
    addSpacing('paddingLeft', 'pl');
    addSpacing('paddingRight', 'pr');

    return classes.join(' ');
};

/**
 * Header/Headline Renderer - supports auto-resize when maxHeight is set
 */
const HeaderRenderer = ({ article, elementId, t, config }) => {
    const ref = useRef(null);
    const content = getElementContent(article, elementId, 'article_header', t);

    // Hindi Typography Check
    const isHindi = article.published_language === 'HN' || article.published_language === 'hi';
    const fontClass = isHindi ? 'font-halant' : '';

    // Apply config styles
    const className = getConfigClasses(config, '4xl'); // Default to 4xl for headers if not set
    const Tag = config?.tag || 'h1';

    useEffect(() => {
        if (!ref.current || !config?.maxHeight) return;

        const element = ref.current;
        const maxHeightPx = parseInt(config.maxHeight) * 4;
        let currentFontSize = 48; // Start from large font

        element.style.fontSize = `${currentFontSize}px`;

        while (element.scrollHeight > maxHeightPx && currentFontSize > 14) {
            currentFontSize -= 2;
            element.style.fontSize = `${currentFontSize}px`;
        }
    }, [config?.maxHeight, content]);

    return (
        <Tag ref={ref} className={`leading-tight ${fontClass} ${className}`}>
            {content}
        </Tag>
    );
};

/**
 * Summary/Lead Renderer - supports auto-resize when maxHeight is set
 */
const SummaryRenderer = ({ article, elementId, t, config }) => {
    const ref = useRef(null);
    const content = getElementContent(article, elementId, 'summary', t);

    // Hindi Typography Check
    const isHindi = article.published_language === 'HN' || article.published_language === 'hi';
    // Anek Devanagari (Semi-Bold -> font-semibold)
    const fontClass = isHindi ? 'font-anek font-semibold' : 'italic';

    const className = getConfigClasses(config, 'xl'); // Default to xl for summary

    useEffect(() => {
        if (!ref.current || !config?.maxHeight) return;

        const element = ref.current;
        const maxHeightPx = parseInt(config.maxHeight) * 4;
        let currentFontSize = 20;

        element.style.fontSize = `${currentFontSize}px`;

        while (element.scrollHeight > maxHeightPx && currentFontSize > 12) {
            currentFontSize -= 1;
            element.style.fontSize = `${currentFontSize}px`;
        }
    }, [config?.maxHeight, content]);

    return (
        <p ref={ref} className={`${fontClass} ${className}`}>
            {content}
        </p>
    );
};

/**
 * Body Content Renderer - supports auto-resize when maxHeight is set
 */
const BodyRenderer = ({ article, elementId, t, config }) => {
    const ref = useRef(null);
    const body = getElementContent(article, elementId, 'body', t);
    const isHTML = body && /<[a-z][\s\S]*>/i.test(body);

    // Hindi Typography Check
    const isHindi = article.published_language === 'HN' || article.published_language === 'hi';
    const fontClass = isHindi ? 'hindi-content font-tiro leading-[1.8] text-[#333333]' : '';

    // For body, we usually don't want to enforce font-size on the wrapper if it's HTML, 
    // but user wants control. 'prose' class usually controls size.
    // If we add text-lg or text-xl to prose, it should scale.
    const className = getConfigClasses(config, 'lg'); // Default to lg

    useEffect(() => {
        if (!ref.current || !config?.maxHeight) return;

        const element = ref.current;
        const maxHeightPx = parseInt(config.maxHeight) * 4;
        let currentFontSize = 18;

        element.style.fontSize = `${currentFontSize}px`;

        while (element.scrollHeight > maxHeightPx && currentFontSize > 11) {
            currentFontSize -= 1;
            element.style.fontSize = `${currentFontSize}px`;
        }
    }, [config?.maxHeight, body]);

    if (isHTML) {
        return (
            <div
                ref={ref}
                className={`prose md:prose-lg max-w-none ${fontClass} ${className}`}
                dangerouslySetInnerHTML={{ __html: body }}
            />
        );
    }

    return (
        <div ref={ref} className={`whitespace-pre-wrap ${fontClass} ${className}`}>
            {body}
        </div>
    );
};

/**
 * Image Renderer with lightbox potential
 */
const ImageRenderer = ({ article, elementId, t, config }) => {
    // Check for element-specific image first
    let elementContent = t(article, 'elementContent');

    // Fix for empty object returned by Mongoose/t()
    if (elementContent && typeof elementContent === 'object' && !Array.isArray(elementContent) && Object.keys(elementContent).length === 0) {
        elementContent = article.elementContent_en;
    }
    elementContent = elementContent || article.elementContent_en;

    let image = null;
    let objectPosition = 'center';

    /* DEBUG: Check data flow */
    // console.log('DEBUG ImageRenderer:', { elementId, hasContent: !!elementContent, contentType: typeof elementContent });

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];

        // console.log('DEBUG Image Content Lookup:', { elementId, found: !!content, value: content?.value });

        if (content) {
            if (typeof content === 'string') {
                image = content.split(',')[0]?.trim();
            } else if (content.value) {
                // Element-specific image (could be comma-separated)
                image = content.value.split(',')[0]?.trim();
                // Get position if available
                if (content.objectPosition) {
                    objectPosition = content.objectPosition;
                }
            }
        }
    }

    // Fall back removed to prevent duplication of main image in custom blocks
    // if (!image) {
    //    image = article.photos && article.photos.length > 0 ? article.photos[0] : null;
    // }

    if (!image) {
        return (
            <div className="bg-gray-100 flex items-center justify-center text-gray-400 h-48 rounded-md">
                No image available
            </div>
        );
    }

    // Build style object for image
    const imageStyle = {
        objectFit: config?.objectFit || 'cover',
        width: '100%',
        objectPosition: objectPosition
    };

    // If maxHeight is set, prioritize it over aspect ratio
    if (config?.maxHeight) {
        imageStyle.maxHeight = '100%';
        imageStyle.height = 'auto';
        imageStyle.objectFit = 'contain'; // Use contain to show full image within bounds
        imageStyle.objectPosition = 'center'; // Reset position for contain mode
    } else if (config?.aspectRatio) {
        imageStyle.aspectRatio = config.aspectRatio;
    }

    return (
        <figure className={config?.maxHeight ? 'h-full' : ''}>
            {/* DEBUG: Remove after fixing */}
            <div className="text-xs text-red-500 bg-white border border-red-500 p-1 mb-1 hidden">
                ID: {elementId} <br />
                Found: {elementContent && (elementContent instanceof Map ? elementContent.has(elementId) : elementContent[elementId] ? 'YES' : 'NO')} <br />
                Keys: {elementContent ? Object.keys(elementContent instanceof Map ? Object.fromEntries(elementContent) : elementContent).join(', ').substring(0, 50) : 'None'}
            </div>

            <img
                src={image}
                alt={t(article, 'article_header')}
                className="w-full h-auto experiment-image"
                style={imageStyle}
                loading="lazy"
            />
            {article.photos && article.photos.length > 1 && (
                <figcaption className="text-sm text-gray-500 mt-2 text-center italic">
                    {article.photos.length} photos available
                </figcaption>
            )}
        </figure>
    );
};

/**
 * Video Renderer
 */
const VideoRenderer = ({ article, elementId, config }) => {
    // Check for element-specific video first
    let videoUrl = null;
    const elementContent = article.elementContent_en;

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];
        if (content) {
            videoUrl = typeof content === 'string' ? content : content.value;
        }
    }

    // Fall back to article video
    if (!videoUrl) {
        videoUrl = article.video;
    }

    if (!videoUrl) {
        return (
            <div
                className="bg-gray-900 flex items-center justify-center text-gray-400 rounded-md"
                style={{ aspectRatio: config?.aspectRatio || '16/9' }}
            >
                No video available
            </div>
        );
    }

    // Convert YouTube watch URL to embed URL
    const getEmbedUrl = (url) => {
        if (url.includes('youtube.com/watch')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1];
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    };

    return (
        <div style={{ aspectRatio: config?.aspectRatio || '16/9' }}>
            <iframe
                className="w-full h-full rounded-md"
                src={getEmbedUrl(videoUrl)}
                title="Video"
                allowFullScreen
                loading="lazy"
            />
        </div>
    );
};

/**
 * Author Info Renderer
 */
const AuthorRenderer = ({ article }) => {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                {article.author?.charAt(0) || <User size={20} />}
            </div>
            <div>
                <div className="font-semibold text-gray-900">{article.author || 'Anonymous'}</div>
                <div className="text-xs text-gray-500">Author</div>
            </div>
        </div>
    );
};

/**
 * Date Renderer
 */
const DateRenderer = ({ article }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={16} />
            <span>{formatDate(article.createdAt)}</span>
        </div>
    );
};

/**
 * Tags Renderer
 */
const TagsRenderer = ({ article, elementId, t }) => {
    // Check for element-specific tags first
    let tags = [];
    let elementContent = t(article, 'elementContent');

    // Fix for empty object returned by Mongoose/t()
    if (elementContent && typeof elementContent === 'object' && !Array.isArray(elementContent) && Object.keys(elementContent).length === 0) {
        elementContent = article.elementContent_en;
    }
    elementContent = elementContent || article.elementContent_en;

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];
        if (content?.value) {
            // Element-specific tags (comma-separated string)
            tags = content.value.split(',').map(t => t.trim()).filter(Boolean);
        }
    }

    // Fall back to article tags
    if (tags.length === 0) {
        const articleTags = t(article, 'tags') || [];
        tags = articleTags.filter(tag => tag && tag.trim());
    }

    // If still no tags, fall back to keywords (as users often confuse them)
    if (tags.length === 0) {
        const keywords = t(article, 'keywords') || [];
        tags = keywords.filter(k => k && k.trim());
    }

    if (tags.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
                <span
                    key={idx}
                    className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full hover:bg-red-200 transition cursor-pointer"
                >
                    {tag}
                </span>
            ))}
        </div>
    );
};

/**
 * Custom Text Renderer - supports auto-resize when maxHeight is set
 */
const TextRenderer = ({ config }) => {
    const ref = useRef(null);
    const className = getConfigClasses(config, 'base'); // Default to base

    useEffect(() => {
        if (!ref.current || !config?.maxHeight) return;

        const element = ref.current;
        const maxHeightPx = parseInt(config.maxHeight) * 4;
        let currentFontSize = 16;

        element.style.fontSize = `${currentFontSize}px`;

        while (element.scrollHeight > maxHeightPx && currentFontSize > 10) {
            currentFontSize -= 1;
            element.style.fontSize = `${currentFontSize}px`;
        }
    }, [config?.maxHeight, config?.customContent]);

    return (
        <div ref={ref} className={className}>
            {config?.customContent || 'Custom content...'}
        </div>
    );
};

/**
 * Divider Renderer
 */
const DividerRenderer = ({ config }) => {
    return (
        <hr className={`border-t border-${config?.borderColor || 'gray-200'}`} />
    );
};

/**
 * Spacer Renderer
 */
const SpacerRenderer = ({ config }) => {
    return <div className={`h-${config?.marginTop || '8'}`} />;
};

/**
 * Social Share Component (bonus)
 */
export const SocialShare = ({ article, t }) => {
    const shareUrl = window.location.href;
    const title = t(article, 'article_header');

    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 flex items-center gap-1">
                <Share2 size={16} />
                Share
            </span>
            <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
            >
                <Facebook size={18} />
            </a>
            <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-sky-100 text-sky-500 hover:bg-sky-200 transition"
            >
                <Twitter size={18} />
            </a>
            <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
            >
                <Linkedin size={18} />
            </a>
        </div>
    );
};

export default ElementRenderers;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import { User, Calendar, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';

// Define explicit interfaces for config and props
interface ElementConfig {
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    textAlign?: string;
    textColor?: string;
    lineHeight?: string;
    textDecoration?: string;
    textTransform?: any;
    letterSpacing?: string;
    fontStyle?: string;
    boxShadow?: string;
    shadowEnabled?: boolean;
    shadowX?: number;
    shadowY?: number;
    shadowBlur?: number;
    shadowColor?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    marginTop?: string;
    backgroundColor?: string;
    borderRadius?: string;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: string;
    maxHeight?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
    aspectRatio?: string;
    customContent?: string;
    fillColor?: string;
    shapeType?: string;
    strokeWidth?: number;
    strokeColor?: string;
    [key: string]: any;
}

interface ElementRendererProps {
    type: string;
    elementId?: string;
    config?: ElementConfig;
    article?: any; // Keeping article as any for now due to complex schema
    t?: (obj: any, field: string) => any;
}

/**
 * Helper function to get element-specific content or fall back to article field
 */
const getElementContent = (article: any, elementId: string | undefined, fieldName: string, t: any) => {
    if (!article || !t) return '';

    // Check for element-specific content first (using language-aware lookup)
    let elementContent = t(article, 'elementContent');

    // If elementContent is an empty object (Mongoose default), try fallback to en
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
 * Helper to get Tailwind classes from config using explicit maps
 */
const FONT_SIZES: Record<string, string> = {
    'xs': 'text-xs', 'sm': 'text-sm', 'base': 'text-base', 'lg': 'text-lg',
    'xl': 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '5xl': 'text-5xl'
};
const FONT_WEIGHTS: Record<string, string> = {
    'light': 'font-light', 'normal': 'font-normal', 'medium': 'font-medium',
    'semibold': 'font-semibold', 'bold': 'font-bold'
};
const TEXT_ALIGNS: Record<string, string> = {
    'left': 'text-left', 'center': 'text-center', 'right': 'text-right', 'justify': 'text-justify'
};
const FONT_FAMILIES: Record<string, string> = {
    'serif': 'font-serif', 'sans': 'font-sans'
};

const getConfigClasses = (config: ElementConfig | undefined, defaultSize = 'base') => {
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
    const TEXT_COLORS: Record<string, string> = {
        'gray-900': 'text-gray-900', 'gray-700': 'text-gray-700', 'gray-600': 'text-gray-600',
        'gray-500': 'text-gray-500', 'brand-red': 'text-brand-red', 'white': 'text-white',
        'red-500': 'text-red-500', 'blue-500': 'text-blue-500'
    };
    if (config.textColor) {
        if (TEXT_COLORS[config.textColor]) classes.push(TEXT_COLORS[config.textColor]);
        else classes.push(config.textColor.startsWith('text-') ? config.textColor : `text-${config.textColor}`);
    }

    // Spacing (dynamic usually fine for numbers or safelisted keys)
    const SPACING_MAP: Record<string, string> = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '6': '6', '8': '8', '10': '10', '12': '12', '16': '16'
    };

    const addSpacing = (prop: string, prefix: string) => {
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
 * Generate Inline Styles for Typography/Colors/Effects
 */
const getInlineStyles = (config: ElementConfig | undefined): React.CSSProperties => {
    if (!config) return {};

    const styles: React.CSSProperties = {};

    if (config.lineHeight) {
        const heights: Record<string, number> = { 'tight': 1.25, 'normal': 1.5, 'relaxed': 1.625, 'loose': 2 };
        if (heights[config.lineHeight]) styles.lineHeight = heights[config.lineHeight];
    }

    // Colors
    if (config.textColor) styles.color = config.textColor;

    // Font Family
    if (config.fontFamily) {
        const map: Record<string, string> = {
            'sans': 'ui-sans-serif, system-ui, sans-serif',
            'serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
            'mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            'times': '"Times New Roman", Times, serif',
            'arial': 'Arial, Helvetica, sans-serif',
            'verdana': 'Verdana, Geneva, Tahoma, sans-serif',
            'georgia': 'Georgia, serif',
            'courier': '"Courier New", Courier, monospace',
            'trebuchet': '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif',
            'helvetica': 'Helvetica, Arial, sans-serif'
        };
        styles.fontFamily = map[config.fontFamily] || 'inherit';
    }

    // Advanced Text
    if (config.textDecoration) styles.textDecoration = config.textDecoration;
    if (config.textTransform) styles.textTransform = config.textTransform;
    if (config.letterSpacing) {
        const map: Record<string, string> = {
            'tighter': '-0.05em', 'tight': '-0.025em', 'normal': '0',
            'wide': '0.025em', 'wider': '0.05em', 'widest': '0.1em'
        };
        styles.letterSpacing = map[config.letterSpacing] || 'normal';
    }

    // Explicit fontStyle handling
    if (config.fontStyle === 'italic' || config.fontStyle === 'normal') {
        styles.fontStyle = config.fontStyle;
    }

    // Box Shadow
    if (config.boxShadow) {
        const map: Record<string, string> = {
            'none': 'none',
            'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
        };
        styles.boxShadow = map[config.boxShadow] || 'none';
    }

    return styles;
};

// --- Sub-Renderers ---

const HeaderRenderer = ({ article, elementId, t, config }: any) => {
    const ref = useRef<HTMLHeadingElement>(null);
    const content = getElementContent(article, elementId, 'article_header', t);

    // Hindi Typography Check
    const isHindi = article?.published_language === 'HN' || article?.published_language === 'hi';
    const fontClass = isHindi ? 'font-halant' : '';

    const className = getConfigClasses(config, '4xl');
    const inlineStyles = getInlineStyles(config);
    const Tag = (config?.tag || 'h1') as keyof React.JSX.IntrinsicElements;

    useEffect(() => {
        if (!ref.current || !config?.maxHeight) return;

        const element = ref.current;
        const maxHeightPx = parseInt(config.maxHeight) * 4;
        let currentFontSize = 48;

        element.style.fontSize = `${currentFontSize}px`;

        while (element.scrollHeight > maxHeightPx && currentFontSize > 14) {
            currentFontSize -= 2;
            element.style.fontSize = `${currentFontSize}px`;
        }
    }, [config?.maxHeight, content]);

    return React.createElement(Tag, { ref, className: `leading-tight ${fontClass} ${className}`, style: inlineStyles }, content);
};

const SummaryRenderer = ({ article, elementId, t, config }: any) => {
    const ref = useRef<HTMLParagraphElement>(null);
    const content = getElementContent(article, elementId, 'summary', t);

    const isHindi = article?.published_language === 'HN' || article?.published_language === 'hi';
    const fontClass = isHindi ? 'font-anek font-semibold' : 'italic';

    const className = getConfigClasses(config, 'xl');
    const inlineStyles = getInlineStyles(config);

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
        <p ref={ref} className={`${fontClass} ${className}`} style={inlineStyles}>
            {content}
        </p>
    );
};

const BodyRenderer = ({ article, elementId, t, config }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const body = getElementContent(article, elementId, 'body', t);
    const isHTML = body && /<[a-z][\s\S]*>/i.test(body);

    const isHindi = article?.published_language === 'HN' || article?.published_language === 'hi';
    const fontClass = isHindi ? 'hindi-content font-tiro leading-[1.8] text-[#333333]' : '';

    const className = getConfigClasses(config, 'lg');
    const inlineStyles = getInlineStyles(config);

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
                style={inlineStyles}
                dangerouslySetInnerHTML={{ __html: body }}
            />
        );
    }

    return (
        <div ref={ref} className={`whitespace-pre-wrap ${fontClass} ${className}`} style={inlineStyles}>
            {body}
        </div>
    );
};

const ImageRenderer = ({ article, elementId, t, config }: any) => {
    // Check for element-specific image first
    let elementContent = t(article, 'elementContent');

    if (elementContent && typeof elementContent === 'object' && !Array.isArray(elementContent) && Object.keys(elementContent).length === 0) {
        elementContent = article.elementContent_en;
    }
    elementContent = elementContent || article.elementContent_en;

    let image = null;
    let objectPosition = 'center';

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];

        if (content) {
            if (typeof content === 'string') {
                image = content.split(',')[0]?.trim();
            } else if (content.value) {
                image = content.value.split(',')[0]?.trim();
                if (content.objectPosition) {
                    objectPosition = content.objectPosition;
                }
            }
        }
    }

    if (!image) {
        return (
            <div className="bg-gray-100 flex items-center justify-center text-gray-400 h-48 rounded-md">
                No image available
            </div>
        );
    }

    const inlineStyles = getInlineStyles(config);
    const imageStyle: React.CSSProperties = {
        objectFit: config?.objectFit || 'cover',
        width: '100%',
        objectPosition: objectPosition,
        ...inlineStyles
    };

    if (config?.maxHeight) {
        imageStyle.maxHeight = '100%';
        imageStyle.height = 'auto';
        imageStyle.objectFit = 'contain';
        imageStyle.objectPosition = 'center';
    } else if (config?.aspectRatio) {
        // Handle aspect ratio via style if needed, though Tailwind aspect-ratio plugin usually better
        (imageStyle as any).aspectRatio = config.aspectRatio;
    }

    return (
        <figure className={config?.maxHeight ? 'h-full' : ''}>
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

const VideoRenderer = ({ article, elementId, config }: any) => {
    let videoUrl = null;
    const elementContent = article?.elementContent_en;

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];
        if (content) {
            videoUrl = typeof content === 'string' ? content : content.value;
        }
    }

    if (!videoUrl) {
        videoUrl = article?.video;
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

    const getEmbedUrl = (url: string) => {
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

const AuthorRenderer = ({ article }: any) => {
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

const DateRenderer = ({ article }: any) => {
    const formatDate = (dateString: string) => {
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

const TagsRenderer = ({ article, elementId, t }: any) => {
    let tags: string[] = [];
    let elementContent = t(article, 'elementContent');

    if (elementContent && typeof elementContent === 'object' && !Array.isArray(elementContent) && Object.keys(elementContent).length === 0) {
        elementContent = article.elementContent_en;
    }
    elementContent = elementContent || article.elementContent_en;

    if (elementContent && elementId) {
        const content = elementContent instanceof Map
            ? elementContent.get(elementId)
            : elementContent[elementId];
        if (content?.value) {
            tags = content.value.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
    }

    if (tags.length === 0) {
        const articleTags = t(article, 'tags') || [];
        tags = articleTags.filter((tag: string) => tag && tag.trim());
    }

    if (tags.length === 0) {
        const keywords = t(article, 'keywords') || [];
        tags = keywords.filter((k: string) => k && k.trim());
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

const TextRenderer = ({ config }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const className = getConfigClasses(config, 'base');
    const inlineStyles = getInlineStyles(config);

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
        <div ref={ref} className={className} style={inlineStyles}>
            {config?.customContent || 'Custom content...'}
        </div>
    );
};

const DividerRenderer = ({ config }: any) => {
    return (
        <hr className={`border-t border-${config?.borderColor || 'gray-200'}`} />
    );
};

const SpacerRenderer = ({ config }: any) => {
    return <div className={`h-${config?.marginTop || '8'}`} />;
};

const ShapeRenderer = ({ config }: any) => {
    const inlineStyles = getInlineStyles(config);
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: config?.fillColor || '#4f46e5',
                borderRadius: config?.shapeType === 'circle' ? '50%' : config?.borderRadius || 0,
                border: config?.strokeWidth ? `${config?.strokeWidth}px solid ${config?.strokeColor || '#4f46e5'}` : 'none',
                ...inlineStyles
            }}
        />
    );
};

const ContainerRenderer = ({ config }: any) => {
    const inlineStyles = getInlineStyles(config);
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: config?.backgroundColor || '#f9fafb',
                borderRadius: config?.borderRadius || 0,
                border: config?.borderWidth ? `${config?.borderWidth}px solid ${config?.borderColor || '#e5e7eb'}` : 'none',
                ...inlineStyles
            }}
        />
    );
};

export const SocialShare = ({ article, t }: any) => {
    const [shareUrl, setShareUrl] = React.useState('');

    useEffect(() => {
        setShareUrl(window.location.href);
    }, []);

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

/**
 * ElementRenderers - Renders different element types for the dynamic layout
 */
const ElementRenderers = ({ type, elementId, config, article, t }: ElementRendererProps) => {
    const props = { article, elementId, t, config };

    switch (type) {
        case 'header':
            return <HeaderRenderer {...props} />;
        case 'summary':
            return <SummaryRenderer {...props} />;
        case 'body':
            return <BodyRenderer {...props} />;
        case 'image':
            return <ImageRenderer {...props} />;
        case 'video':
            return <VideoRenderer {...props} />;
        case 'author':
            return <AuthorRenderer article={article} />;
        case 'date':
            return <DateRenderer article={article} />;
        case 'tags':
            return <TagsRenderer {...props} />;
        case 'text':
            return <TextRenderer config={config} />;
        case 'divider':
            return <DividerRenderer config={config} />;
        case 'spacer':
            return <SpacerRenderer config={config} />;
        case 'shape':
            return <ShapeRenderer config={config} />;
        case 'container':
            return <ContainerRenderer config={config} />;
        default:
            return <div className="text-gray-400">[Unknown element: {type}]</div>;
    }
};

export default ElementRenderers;

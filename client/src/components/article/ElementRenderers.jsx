import React, { useRef, useEffect } from 'react';
import { User, Calendar, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';

/**
 * ElementRenderers - Renders different element types for the dynamic layout
 */
const ElementRenderers = ({ type, config, article, t }) => {
    switch (type) {
        case 'header':
            return <HeaderRenderer article={article} t={t} config={config} />;
        case 'summary':
            return <SummaryRenderer article={article} t={t} config={config} />;
        case 'body':
            return <BodyRenderer article={article} t={t} config={config} />;
        case 'image':
            return <ImageRenderer article={article} t={t} config={config} />;
        case 'video':
            return <VideoRenderer article={article} config={config} />;
        case 'author':
            return <AuthorRenderer article={article} />;
        case 'date':
            return <DateRenderer article={article} />;
        case 'tags':
            return <TagsRenderer article={article} t={t} />;
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
 * Header/Headline Renderer - supports auto-resize when maxHeight is set
 */
const HeaderRenderer = ({ article, t, config }) => {
    const ref = useRef(null);
    
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
    }, [config?.maxHeight, article]);

    return (
        <h1 ref={ref} className="text-gray-900 leading-tight">
            {t(article, 'article_header')}
        </h1>
    );
};

/**
 * Summary/Lead Renderer - supports auto-resize when maxHeight is set
 */
const SummaryRenderer = ({ article, t, config }) => {
    const ref = useRef(null);
    
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
    }, [config?.maxHeight, article]);

    return (
        <p ref={ref} className="text-gray-600 italic">
            {t(article, 'summary')}
        </p>
    );
};

/**
 * Body Content Renderer - supports auto-resize when maxHeight is set
 */
const BodyRenderer = ({ article, t, config }) => {
    const ref = useRef(null);
    const body = t(article, 'body');
    const isHTML = /<[a-z][\s\S]*>/i.test(body);
    
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
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: body }}
            />
        );
    }

    return (
        <div ref={ref} className="whitespace-pre-wrap text-gray-800">
            {body}
        </div>
    );
};

/**
 * Image Renderer with lightbox potential
 */
const ImageRenderer = ({ article, t, config }) => {
    const image = article.photos && article.photos.length > 0 ? article.photos[0] : null;

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
        width: '100%'
    };

    // If maxHeight is set, prioritize it over aspect ratio
    if (config?.maxHeight) {
        imageStyle.maxHeight = '100%';
        imageStyle.height = 'auto';
        imageStyle.objectFit = 'contain'; // Use contain to show full image within bounds
    } else if (config?.aspectRatio) {
        imageStyle.aspectRatio = config.aspectRatio;
    }

    return (
        <figure className={config?.maxHeight ? 'h-full' : ''}>
            <img
                src={image}
                alt={t(article, 'article_header')}
                className="w-full h-auto"
                style={imageStyle}
                loading="lazy"
            />
            {article.photos.length > 1 && (
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
const VideoRenderer = ({ article, config }) => {
    if (!article.video) {
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
                src={getEmbedUrl(article.video)}
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
const TagsRenderer = ({ article, t }) => {
    const tags = t(article, 'tags') || [];

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
        <div ref={ref}>
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

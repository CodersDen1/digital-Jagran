import { Metadata } from 'next';

// Site-wide SEO defaults
const SITE_NAME = 'Digital Jagran';
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitaljagran.com';
const DEFAULT_TITLE = 'Digital Jagran - Hindi News & Media';
const DEFAULT_DESCRIPTION = 'Latest Hindi News, Breaking News, and Analysis from Digital Jagran.';
const DEFAULT_IMAGE = 'https://digitaljagran.com/logo.png'; // Fallback image

/**
 * Utility function to truncate text
 */
const truncate = (text: string, maxLength = 80, suffix = ' | Digital Jagran') => {
    if (!text) return '';
    const availableLength = maxLength - suffix.length;
    if (text.length <= availableLength) return text + suffix;
    return text.substring(0, availableLength - 3) + '...' + suffix;
};

/**
 * Generate Next.js Metadata object for an article
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateArticleMetadata = (article: any, language = 'en'): Metadata => {
    if (!article) {
        return {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
        };
    }

    // --- Title Calculation ---
    let rawTitle = '';
    if (language === 'en') {
        rawTitle = article.metaTitle_en || article.article_header_en || article.metaTitle || article.article_header || '';
    }
    if (!rawTitle) {
        rawTitle = article.metaTitle || article.article_header || '';
    }
    const title = truncate(rawTitle);

    // --- Description Calculation ---
    let desc = '';
    if (language === 'en') {
        desc = article.metaDescription_en || article.summary_en || article.metadata_en || article.metaDescription || article.summary || article.metadata || '';
    }
    if (!desc) {
        desc = article.metaDescription || article.summary || article.metadata || '';
    }
    const description = desc || DEFAULT_DESCRIPTION;

    // --- Keywords Calculation ---
    let keywordsArray: string[] = [];
    if (article.metaKeywords && Array.isArray(article.metaKeywords) && article.metaKeywords.length > 0) {
        keywordsArray = article.metaKeywords;
    } else if (article.keywords && Array.isArray(article.keywords) && article.keywords.length > 0) {
        keywordsArray = article.keywords;
    } else {
        keywordsArray = article.tags_en || article.tags || [];
    }
    const keywords = keywordsArray.slice(0, 15);

    // --- Image ---
    const image = (article.photos && article.photos.length > 0) ? article.photos[0] : DEFAULT_IMAGE;

    // --- Canonical ---
    // Build canonical from article slug (never rely on window in server-side code)
    const articleSlug = article.slug || article._id;
    const canonical = article.canonicalUrl || `${DEFAULT_SITE_URL}/article/${articleSlug}`;

    return {
        title,
        description,
        keywords,
        icons: {
            icon: '/favicon.ico',
        },
        alternates: {
            canonical: canonical,
        },
        openGraph: {
            title,
            description,
            images: [
                {
                    url: image, // Uses article.photos[0] or fallback
                    alt: title,
                }
            ],
            type: 'article',
            url: canonical,
            siteName: SITE_NAME,
            publishedTime: article.createdAt,
            modifiedTime: article.updatedAt,
            authors: [article.author || 'Digital Jagran'],
            section: keywords[0] || 'News',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image], // Uses article.photos[0] or fallback
        },
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateArticleJsonLd = (article: any, language = 'en') => {
    if (!article) return null;

    // Re-calculate basic fields or pass them in? For now just re-calc basics.
    const metadata = generateArticleMetadata(article, language);

    return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": metadata.title,
        "image": article.photos || [],
        "datePublished": article.createdAt,
        "dateModified": article.updatedAt,
        "author": [{
            "@type": "Person",
            "name": article.author || "Digital Jagran"
        }],
        "publisher": {
            "@type": "Organization",
            "name": "Digital Jagran",
            "logo": {
                "@type": "ImageObject",
                "url": "https://digitaljagran.com/logo.png"
            }
        },
        "description": metadata.description,
    };
};

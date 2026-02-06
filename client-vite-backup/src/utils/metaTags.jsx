import React from 'react';

// Site-wide SEO defaults
const SITE_NAME = 'Digital Jagran';
// Use environment variable or fallback
const DEFAULT_SITE_URL = 'https://digitaljagran.com';
const DEFAULT_TITLE = 'Digital Jagran - Hindi News & Media';
const DEFAULT_DESCRIPTION = 'Latest Hindi News, Breaking News, and Analysis from Digital Jagran.';
const DEFAULT_IMAGE = 'https://digitaljagran.com/logo.png'; // Fallback image

/**
 * Utility function to truncate text
 */
const truncate = (text, maxLength = 65, suffix = ' | Digital Jagran') => {
    if (!text) return '';
    const availableLength = maxLength - suffix.length;
    if (text.length <= availableLength) return text + suffix;
    return text.substring(0, availableLength - 3) + '...' + suffix;
};

/**
 * Generate meta tags config for an article
 */
export const generateArticleMetaTags = (article, language = 'en') => {
    // Default structure
    const config = {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        type: 'website',
        keywords: [],
        canonical: '',
        schema: null,
        additionalTags: {}
    };

    if (!article) return config;

    // --- Title Calculation ---
    let rawTitle = '';
    if (language === 'en') {
        rawTitle = article.metaTitle_en || article.article_header_en || article.metaTitle || article.article_header || '';
    }
    if (!rawTitle) {
        rawTitle = article.metaTitle || article.article_header || '';
    }
    config.title = truncate(rawTitle);

    // --- Description Calculation ---
    let desc = '';
    if (language === 'en') {
        desc = article.metaDescription_en || article.summary_en || article.metadata_en || article.metaDescription || article.summary || article.metadata || '';
    }
    if (!desc) {
        desc = article.metaDescription || article.summary || article.metadata || '';
    }
    config.description = desc || DEFAULT_DESCRIPTION;

    // --- Keywords Calculation ---
    let keywordsArray = [];
    if (article.metaKeywords && Array.isArray(article.metaKeywords) && article.metaKeywords.length > 0) {
        keywordsArray = article.metaKeywords;
    } else if (article.keywords && Array.isArray(article.keywords) && article.keywords.length > 0) {
        keywordsArray = article.keywords;
    } else {
        keywordsArray = article.tags_en || article.tags || [];
    }
    config.keywords = keywordsArray.slice(0, 15); // Top 15 keywords

    // --- Image ---
    if (article.photos && article.photos.length > 0) {
        config.image = article.photos[0];
    }

    // --- Canonical ---
    config.canonical = article.canonicalUrl || (window.location.href ? window.location.href.split('?')[0] : DEFAULT_SITE_URL);

    // --- Type ---
    config.type = 'article';

    // --- Additional Tags (OpenGraph / Twitter / Custom) ---
    config.additionalTags = {
        'article:publisher': 'https://www.facebook.com/digitaljagran',
        'article:author': article.author || 'Digital Jagran',
        'article:section': config.keywords[0] || 'News',
        'twitter:card': 'summary_large_image',
    };

    // --- Schema.org JSON-LD ---
    // We can keep the simpler logic here or expand it. 
    // This matches what was in ArticleDetail.jsx
    config.schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": config.title,
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
        "description": config.description,
        // We might not have full htmlContent here easily without passing it in, 
        // so we fall back to a reasonable placeholder or property if available.
        // For now, we'll omit articleBody or use description as fallback to avoid passing huge HTML strings around unless necessary.
        // If strict parity is needed, we can update the function signature.
        "articleBody": desc
    };

    return config;
};


/**
 * Render meta tags from a config object (Compatible with react-helmet-async)
 */
export const renderMetaTags = (meta) => {
    if (!meta) return null;

    return (
        <React.Fragment>
            {/* Basic SEO */}
            <title>{meta.title}</title>
            <meta name="description" content={meta.description} />
            {meta.keywords && meta.keywords.length > 0 && (
                <meta name="keywords" content={meta.keywords.join(', ')} />
            )}

            {/* Canonical URL */}
            {meta.canonical && (
                <link rel="canonical" href={meta.canonical} />
            )}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={meta.type || 'website'} />
            <meta property="og:title" content={meta.title} />
            <meta property="og:description" content={meta.description} />
            <meta property="og:image" content={meta.image} />
            <meta property="og:url" content={meta.canonical} />
            <meta property="og:site_name" content={SITE_NAME} />

            {/* Twitter */}
            <meta name="twitter:title" content={meta.title} />
            <meta name="twitter:description" content={meta.description} />
            <meta name="twitter:image" content={meta.image} />

            {/* Additional custom/social tags */}
            {meta.additionalTags && Object.entries(meta.additionalTags).map(([key, value]) => {
                // Determine if it's 'name' or 'property' based on common conventions
                // OpenGraph uses property, Twitter uses name (mostly), others use name.
                const isProperty = key.startsWith('og:') || key.startsWith('article:') || key.startsWith('product:');
                return isProperty ?
                    <meta key={key} property={key} content={value} /> :
                    <meta key={key} name={key} content={value} />;
            })}

            {/* Schema.org structured data */}
            {meta.schema && (
                <script type="application/ld+json">
                    {JSON.stringify(meta.schema)}
                </script>
            )}
        </React.Fragment>
    );
};

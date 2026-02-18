const NodeCache = require('node-cache');

/**
 * Cache Service - Centralized caching layer using node-cache
 * 
 * Cache Strategy:
 * - articles_all: All articles list, TTL 60s (frequently updated content)
 * - articles_published: Published articles only, TTL 60s
 * - article_{id}: Individual article by ID/slug, TTL 120s
 * - trending_{limit}: Trending articles, TTL 90s (view counts change often)
 * - layouts_all: All layouts, TTL 300s (rarely changes)
 * - layout_{id}: Individual layout, TTL 300s
 * - layout_default: Default layout, TTL 300s
 * - freeform_layouts_all: All freeform layouts, TTL 300s
 * - freeform_layout_{id}: Individual freeform layout, TTL 300s
 * - freeform_layout_default: Default freeform layout, TTL 300s
 */

// Main cache for articles (shorter TTL since content updates frequently)
const articleCache = new NodeCache({
    stdTTL: 60,         // 60 seconds default TTL
    checkperiod: 30,    // Check for expired keys every 30s
    useClones: false,   // Return references for better performance
    maxKeys: 500,       // Max 500 cached items
});

// Cache for layouts (longer TTL since layouts rarely change)
const layoutCache = new NodeCache({
    stdTTL: 300,        // 5 minutes default TTL
    checkperiod: 60,
    useClones: false,
    maxKeys: 100,
});

// Cache for trending articles (medium TTL)
const trendingCache = new NodeCache({
    stdTTL: 90,         // 90 seconds
    checkperiod: 30,
    useClones: false,
    maxKeys: 20,
});

/**
 * Generic cache wrapper - get from cache or execute fetcher
 * @param {NodeCache} cache - The cache instance to use
 * @param {string} key - Cache key 
 * @param {Function} fetcher - Async function to call on cache miss
 * @param {number} [ttl] - Optional custom TTL in seconds
 * @returns {Promise<any>} Cached or freshly fetched data
 */
const getOrSet = async (cache, key, fetcher, ttl) => {
    const cached = cache.get(key);
    if (cached !== undefined) {
        return cached;
    }

    const data = await fetcher();
    if (data !== null && data !== undefined) {
        if (ttl) {
            cache.set(key, data, ttl);
        } else {
            cache.set(key, data);
        }
    }
    return data;
};

// ===== Article Cache Methods =====

const getCachedArticles = async (fetcher) => {
    return getOrSet(articleCache, 'articles_all', fetcher);
};

const getCachedPublishedArticles = async (fetcher) => {
    return getOrSet(articleCache, 'articles_published', fetcher, 60);
};

const getCachedArticle = async (idOrSlug, fetcher) => {
    return getOrSet(articleCache, `article_${idOrSlug}`, fetcher, 120);
};

const getCachedTrending = async (limit, fetcher) => {
    return getOrSet(trendingCache, `trending_${limit}`, fetcher);
};

// ===== Layout Cache Methods =====

const getCachedLayouts = async (fetcher) => {
    return getOrSet(layoutCache, 'layouts_all', fetcher);
};

const getCachedLayout = async (id, fetcher) => {
    return getOrSet(layoutCache, `layout_${id}`, fetcher);
};

const getCachedDefaultLayout = async (fetcher) => {
    return getOrSet(layoutCache, 'layout_default', fetcher);
};

// ===== Freeform Layout Cache Methods =====

const getCachedFreeformLayouts = async (fetcher) => {
    return getOrSet(layoutCache, 'freeform_layouts_all', fetcher);
};

const getCachedFreeformLayout = async (id, fetcher) => {
    return getOrSet(layoutCache, `freeform_layout_${id}`, fetcher);
};

const getCachedDefaultFreeformLayout = async (fetcher) => {
    return getOrSet(layoutCache, 'freeform_layout_default', fetcher);
};

// ===== Invalidation Methods =====

/**
 * Invalidate all article-related caches
 * Call after create, update, delete operations
 */
const invalidateArticles = () => {
    articleCache.del('articles_all');
    articleCache.del('articles_published');
    // Flush all individual article caches too
    const keys = articleCache.keys().filter(k => k.startsWith('article_'));
    keys.forEach(k => articleCache.del(k));
    // Also invalidate trending since it depends on articles
    trendingCache.flushAll();
};

/**
 * Invalidate a specific article cache
 */
const invalidateArticle = (idOrSlug) => {
    articleCache.del(`article_${idOrSlug}`);
    articleCache.del('articles_all');
    articleCache.del('articles_published');
};

/**
 * Invalidate all layout caches
 */
const invalidateLayouts = () => {
    const keys = layoutCache.keys().filter(k => k.startsWith('layout'));
    keys.forEach(k => layoutCache.del(k));
};

/**
 * Invalidate all freeform layout caches
 */
const invalidateFreeformLayouts = () => {
    const keys = layoutCache.keys().filter(k => k.startsWith('freeform_layout'));
    keys.forEach(k => layoutCache.del(k));
};

/**
 * Invalidate trending cache (e.g., after view increment)
 */
const invalidateTrending = () => {
    trendingCache.flushAll();
};

/**
 * Get cache statistics for monitoring
 */
const getStats = () => ({
    articles: articleCache.getStats(),
    layouts: layoutCache.getStats(),
    trending: trendingCache.getStats(),
});

module.exports = {
    // Article
    getCachedArticles,
    getCachedPublishedArticles,
    getCachedArticle,
    getCachedTrending,
    invalidateArticles,
    invalidateArticle,
    invalidateTrending,
    // Layout
    getCachedLayouts,
    getCachedLayout,
    getCachedDefaultLayout,
    invalidateLayouts,
    // Freeform Layout
    getCachedFreeformLayouts,
    getCachedFreeformLayout,
    getCachedDefaultFreeformLayout,
    invalidateFreeformLayouts,
    // Utils
    getStats,
};

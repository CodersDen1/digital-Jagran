const NodeCache = require('node-cache');
const redis = require('./redisService');

/**
 * Cache Service - Two-layer caching: L1 (in-process) + L2 (Redis)
 * 
 * L1: node-cache (instant, ~0ms, short TTL 30s)
 * L2: Redis (persistent, ~1ms, longer TTL 120s)
 * 
 * Flow: L1 hit → return | L1 miss → L2 hit → populate L1 → return | L2 miss → MongoDB → populate both → return
 * 
 * Cache Keys:
 * - articles_all: All articles list
 * - articles_published: Published articles only
 * - articles_published_light: Published articles (light fields only)
 * - article_{id}: Individual article by ID/slug
 * - trending_{limit}: Trending articles
 * - layouts_all / layout_{id} / layout_default
 * - freeform_layouts_all / freeform_layout_{id} / freeform_layout_default
 */

// L1 caches (in-process, very short TTL)
const articleCache = new NodeCache({
    stdTTL: 30,         // 30 seconds
    checkperiod: 15,
    useClones: false,
    maxKeys: 500,
});

const layoutCache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false,
    maxKeys: 100,
});

const trendingCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 30,
    useClones: false,
    maxKeys: 20,
});

// Redis TTLs (in seconds)
const REDIS_TTL = {
    articles: 120,       // 2 minutes
    article: 300,        // 5 minutes
    trending: 90,        // 90 seconds
    layout: 600,         // 10 minutes
};

/**
 * Two-layer cache wrapper
 * L1 (node-cache) → L2 (Redis) → fetcher (MongoDB)
 */
const getOrSet = async (l1Cache, key, fetcher, l1Ttl, redisTtl) => {
    // L1 check
    const l1Data = l1Cache.get(key);
    if (l1Data !== undefined) {
        return l1Data;
    }

    // L2 check (Redis)
    const l2Data = await redis.get(key);
    if (l2Data !== null) {
        // Populate L1 from L2
        l1Cache.set(key, l2Data, l1Ttl);
        return l2Data;
    }

    // Cache miss - fetch from source (MongoDB)
    const data = await fetcher();
    if (data !== null && data !== undefined) {
        // Populate both layers
        l1Cache.set(key, data, l1Ttl);
        await redis.set(key, data, redisTtl);
    }
    return data;
};

// ===== Article Cache Methods =====

const getCachedArticles = async (fetcher) => {
    return getOrSet(articleCache, 'articles_all', fetcher, 30, REDIS_TTL.articles);
};

const getCachedPublishedArticles = async (fetcher) => {
    return getOrSet(articleCache, 'articles_published', fetcher, 30, REDIS_TTL.articles);
};

const getCachedPublishedArticlesLight = async (fetcher) => {
    return getOrSet(articleCache, 'articles_published_light', fetcher, 30, REDIS_TTL.articles);
};

const getCachedArticle = async (idOrSlug, fetcher) => {
    return getOrSet(articleCache, `article_${idOrSlug}`, fetcher, 60, REDIS_TTL.article);
};

const getCachedTrending = async (limit, fetcher) => {
    return getOrSet(trendingCache, `trending_${limit}`, fetcher, 60, REDIS_TTL.trending);
};

// ===== Layout Cache Methods =====

const getCachedLayouts = async (fetcher) => {
    return getOrSet(layoutCache, 'layouts_all', fetcher, 300, REDIS_TTL.layout);
};

const getCachedLayout = async (id, fetcher) => {
    return getOrSet(layoutCache, `layout_${id}`, fetcher, 300, REDIS_TTL.layout);
};

const getCachedDefaultLayout = async (fetcher) => {
    return getOrSet(layoutCache, 'layout_default', fetcher, 300, REDIS_TTL.layout);
};

// ===== Freeform Layout Cache Methods =====

const getCachedFreeformLayouts = async (fetcher) => {
    return getOrSet(layoutCache, 'freeform_layouts_all', fetcher, 300, REDIS_TTL.layout);
};

const getCachedFreeformLayout = async (id, fetcher) => {
    return getOrSet(layoutCache, `freeform_layout_${id}`, fetcher, 300, REDIS_TTL.layout);
};

const getCachedDefaultFreeformLayout = async (fetcher) => {
    return getOrSet(layoutCache, 'freeform_layout_default', fetcher, 300, REDIS_TTL.layout);
};

// ===== Invalidation Methods =====

/**
 * Invalidate all article-related caches (both L1 and L2)
 */
const invalidateArticles = async () => {
    // L1
    articleCache.del('articles_all');
    articleCache.del('articles_published');
    articleCache.del('articles_published_light');
    const keys = articleCache.keys().filter(k => k.startsWith('article_'));
    keys.forEach(k => articleCache.del(k));
    trendingCache.flushAll();

    // L2
    await redis.del('articles_all', 'articles_published', 'articles_published_light');
    await redis.delPattern('article_*');
    await redis.delPattern('trending_*');
};

const invalidateArticle = async (idOrSlug) => {
    articleCache.del(`article_${idOrSlug}`);
    articleCache.del('articles_all');
    articleCache.del('articles_published');
    articleCache.del('articles_published_light');

    await redis.del(`article_${idOrSlug}`, 'articles_all', 'articles_published', 'articles_published_light');
};

const invalidateLayouts = async () => {
    const keys = layoutCache.keys().filter(k => k.startsWith('layout'));
    keys.forEach(k => layoutCache.del(k));
    await redis.delPattern('layout*');
};

const invalidateFreeformLayouts = async () => {
    const keys = layoutCache.keys().filter(k => k.startsWith('freeform_layout'));
    keys.forEach(k => layoutCache.del(k));
    await redis.delPattern('freeform_layout*');
};

const invalidateTrending = async () => {
    trendingCache.flushAll();
    await redis.delPattern('trending_*');
};

/**
 * Precache: Load published articles into both cache layers
 * Called on server startup after DB is connected
 */
const precacheArticles = async (publishedFetcher, lightFetcher, trendingFetcher) => {
    try {
        console.log('[Cache] Precaching articles...');
        const startTime = Date.now();

        const [published, light, trending] = await Promise.all([
            publishedFetcher(),
            lightFetcher(),
            trendingFetcher(10),
        ]);

        // Populate both layers
        articleCache.set('articles_published', published, 30);
        await redis.set('articles_published', published, REDIS_TTL.articles);

        articleCache.set('articles_published_light', light, 30);
        await redis.set('articles_published_light', light, REDIS_TTL.articles);

        trendingCache.set('trending_10', trending, 60);
        await redis.set('trending_10', trending, REDIS_TTL.trending);

        const elapsed = Date.now() - startTime;
        console.log(`[Cache] Precached ${published.length} published articles, ${light.length} light articles, ${trending.length} trending in ${elapsed}ms`);
    } catch (err) {
        console.error('[Cache] Precache failed:', err.message);
    }
};

/**
 * Get cache statistics for monitoring
 */
const getStats = () => ({
    articles: articleCache.getStats(),
    layouts: layoutCache.getStats(),
    trending: trendingCache.getStats(),
    redisConnected: redis.isConnected(),
});

module.exports = {
    // Article
    getCachedArticles,
    getCachedPublishedArticles,
    getCachedPublishedArticlesLight,
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
    // Precache
    precacheArticles,
    // Utils
    getStats,
};

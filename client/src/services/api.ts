import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15s timeout for reliability
});

export interface PaginatedResponse {
    articles: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

/**
 * Get published articles with pagination.
 * Falls back to /articles if /articles/published isn't deployed yet.
 */
export const getArticlesPaginated = async (page = 1, limit = 10): Promise<PaginatedResponse> => {
    try {
        const response = await api.get(`/articles/published?page=${page}&limit=${limit}`);
        return response.data;
    } catch (err: any) {
        // Fallback: if /articles/published is not yet deployed (404), use old endpoint
        if (err?.response?.status === 404) {
            const response = await api.get('/articles');
            const allArticles = Array.isArray(response.data) ? response.data : [];
            const published = allArticles.filter(
                (a: any) => a.status === 'published' || a.isPublished
            );
            const start = (page - 1) * limit;
            const sliced = published.slice(start, start + limit);
            return {
                articles: sliced,
                pagination: {
                    page,
                    limit,
                    total: published.length,
                    totalPages: Math.ceil(published.length / limit),
                    hasMore: start + limit < published.length,
                },
            };
        }
        throw err;
    }
};

/**
 * Legacy: get all articles at once (kept for backward compat)
 */
export const getArticles = async () => {
    const result = await getArticlesPaginated(1, 50);
    return result.articles;
};

export const getArticleById = async (id: string) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
};

export const getLayoutById = async (id: string) => {
    const response = await api.get(`/layouts/${id}`);
    return response.data;
};

export const getDefaultLayout = async () => {
    try {
        const response = await api.get('/layouts/default');
        return response.data;
    } catch (error) {
        // Return null if no default layout exists
        return null;
    }
};

// Track article view (debounced on client side - only call once per article visit)
export const trackArticleView = async (id: string) => {
    try {
        const response = await api.post(`/articles/${id}/view`);
        return response.data;
    } catch (error) {
        console.error('Failed to track view:', error);
        return null;
    }
};

// Get trending articles
export const getTrendingArticles = async (limit = 10) => {
    const response = await api.get(`/articles/trending?limit=${limit}`);
    return response.data;
};

export const getFreeformLayoutById = async (id: string) => {
    const response = await api.get(`/freeform-layouts/${id}`);
    return response.data;
};

export const getArticleHtmlContent = async (id: string, language: string) => {
    const response = await api.get(`/articles/${id}/content?lang=${language}`);
    return response.data;
};

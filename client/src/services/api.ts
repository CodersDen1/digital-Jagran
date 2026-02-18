import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15s timeout for reliability
});

/**
 * Get published articles for client (uses optimized endpoint)
 * No longer fetches ALL articles then filters - server handles it
 */
export const getArticles = async () => {
    const response = await api.get('/articles/published?limit=50');
    return response.data.articles || response.data;
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

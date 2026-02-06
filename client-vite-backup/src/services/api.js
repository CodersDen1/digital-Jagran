import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
    baseURL: API_URL,
});

export const getArticles = async () => {
    const response = await api.get('/articles');
    // Filter for published articles only
    return response.data.filter(a => a.is_Published);
};

export const getArticleById = async (id) => {
    // Append timestamp to prevent caching
    const response = await api.get(`/articles/${id}?t=${new Date().getTime()}`);
    return response.data;
};

export const getLayoutById = async (id) => {
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

// Track article view
export const trackArticleView = async (id) => {
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

export const getFreeformLayoutById = async (id) => {
    const response = await api.get(`/freeform-layouts/${id}`);
    return response.data;
};

export const getArticleHtmlContent = async (id, language) => {
    const response = await api.get(`/articles/${id}/content?lang=${language}`);
    return response.data;
};

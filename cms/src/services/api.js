import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5001/api';

export const api = axios.create({
    baseURL: API_URL,
});

export const articleService = {
    getAll: async () => {
        const response = await api.get('/articles');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/articles/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/articles', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/articles/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/articles/${id}`);
        return response.data;
    },
    deleteBulk: async (ids) => {
        const response = await api.post('/articles/bulk-delete', { ids });
        return response.data;
    },
    translate: async (id) => {
        const response = await api.post(`/articles/${id}/translate`, {});
        return response.data;
    },
    duplicate: async (id) => {
        const response = await api.post(`/articles/${id}/duplicate`, {});
        return response.data;
    }
};

export const layoutService = {
    getAll: async () => {
        const response = await api.get('/layouts');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/layouts/${id}`);
        return response.data;
    },
    getDefault: async () => {
        const response = await api.get('/layouts/default');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/layouts', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/layouts/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/layouts/${id}`);
        return response.data;
    },
    setDefault: async (id) => {
        const response = await api.put(`/layouts/${id}/set-default`);
        return response.data;
    },
    duplicate: async (id, name) => {
        const response = await api.post(`/layouts/${id}/duplicate`, { name });
        return response.data;
    }
};

// Freeform Layout Service (New Legacy Editor)
export const freeformLayoutService = {
    getAll: async () => {
        const response = await api.get('/freeform-layouts');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/freeform-layouts/${id}`);
        return response.data;
    },
    getDefault: async () => {
        const response = await api.get('/freeform-layouts/default');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/freeform-layouts', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/freeform-layouts/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/freeform-layouts/${id}`);
        return response.data;
    },
    setDefault: async (id) => {
        const response = await api.put(`/freeform-layouts/${id}/set-default`);
        return response.data;
    },
    duplicate: async (id, name) => {
        const response = await api.post(`/freeform-layouts/${id}/duplicate`, { name });
        return response.data;
    },
    saveCanvas: async (id, canvasData) => {
        const response = await api.patch(`/freeform-layouts/${id}/canvas`, canvasData);
        return response.data;
    }
};


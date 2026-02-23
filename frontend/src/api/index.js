import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('wms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally → redirect to login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('wms_token');
            localStorage.removeItem('wms_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    profile: () => api.get('/auth/profile'),
    changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
};

// ── Materials ────────────────────────────────────────────────────────────────
export const materialsAPI = {
    list: (params) => api.get('/materials', { params }),
    get: (id) => api.get(`/materials/${id}`),
    create: (data) => api.post('/materials', data),
    update: (id, data) => api.put(`/materials/${id}`, data),
    delete: (id) => api.delete(`/materials/${id}`),
    stockIn: (id, data) => api.post(`/materials/${id}/stock-in`, data),
    stockOut: (id, data) => api.post(`/materials/${id}/stock-out`, data),
    getTransactions: (id, params) => api.get(`/materials/${id}/transactions`, { params }),
};

// ── FG Products ──────────────────────────────────────────────────────────────
export const fgAPI = {
    list: (params) => api.get('/fg-products', { params }),
    get: (id) => api.get(`/fg-products/${id}`),
    create: (data) => api.post('/fg-products', data),
    update: (id, data) => api.put(`/fg-products/${id}`, data),
    delete: (id) => api.delete(`/fg-products/${id}`),
    productionIn: (id, data) => api.post(`/fg-products/${id}/production-in`, data),
    shipmentOut: (id, data) => api.post(`/fg-products/${id}/shipment-out`, data),
    getTransactions: (id, params) => api.get(`/fg-products/${id}/transactions`, { params }),
};

// ── Transactions ─────────────────────────────────────────────────────────────
export const transactionsAPI = {
    list: (params) => api.get('/transactions', { params }),
    confirmMaterial: (id) => api.post(`/transactions/material/${id}/confirm`),
    confirmProduction: (id) => api.post(`/transactions/production/${id}/confirm`),
    confirmShipment: (id) => api.post(`/transactions/shipment/${id}/confirm`),
};

// ── Warehouses ───────────────────────────────────────────────────────────────
export const warehousesAPI = {
    list: (params) => api.get('/warehouses', { params }),
    create: (data) => api.post('/warehouses', data),
    update: (id, data) => api.put(`/warehouses/${id}`, data),
    getAuditLogs: (params) => api.get('/warehouses/audit-logs', { params }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
    list: (params) => api.get('/users', { params }),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
};

// ── Excel ────────────────────────────────────────────────────────────────────
export const excelAPI = {
    exportMaterial: (params) => api.get('/excel/export/material', { params, responseType: 'blob' }),
    exportFG: (params) => api.get('/excel/export/fg', { params, responseType: 'blob' }),
    importMaterial: (formData) => api.post('/excel/import/material', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    importFG: (formData) => api.post('/excel/import/fg', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;

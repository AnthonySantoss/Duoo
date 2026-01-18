import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Use Vite proxy
});

// Request interceptor - Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor - Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect to login on 401 errors
        if (error.response?.status === 401) {
            console.log('[API] 401 Unauthorized - Token may be invalid');
            // Don't remove token here, let AuthContext handle it
        }
        return Promise.reject(error);
    }
);

export default api;

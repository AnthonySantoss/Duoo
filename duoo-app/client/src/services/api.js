import axios from 'axios';

const api = axios.create({
    // Local development uses Vite's proxy. Hosted frontends provide the API
    // origin through VITE_API_URL, for example https://api.example.com/api.
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
});

// Request interceptor - Add token to requests
api.interceptors.request.use((config) => {
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

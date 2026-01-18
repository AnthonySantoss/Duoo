import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [partner, setPartner] = useState(null);
    const [hasPartner, setHasPartner] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            console.log('[AuthContext] Loading user, token exists:', !!token);

            if (token) {
                try {
                    console.log('[AuthContext] Fetching user data...');
                    const res = await api.get('/auth/me');
                    console.log('[AuthContext] User data loaded:', res.data.user.email);
                    setUser(res.data.user);
                    setPartner(res.data.partner);
                    setHasPartner(res.data.hasPartner);
                } catch (error) {
                    console.error('[AuthContext] Failed to load user:', error.response?.status, error.response?.data);
                    // Only remove token if it's actually invalid (401), not on network errors
                    if (error.response?.status === 401) {
                        console.log('[AuthContext] Token invalid, removing...');
                        localStorage.removeItem('token');
                    } else {
                        console.log('[AuthContext] Network error, keeping token for retry');
                    }
                }
            } else {
                console.log('[AuthContext] No token found in localStorage');
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        // Reload full user data to get partner info
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.user);
        setPartner(meRes.data.partner);
        setHasPartner(meRes.data.hasPartner);
    };

    const register = async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        setPartner(null);
        setHasPartner(false);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setPartner(null);
        setHasPartner(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            partner,
            hasPartner,
            login,
            register,
            logout,
            loading,
            setUser,
            setPartner,
            setHasPartner
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

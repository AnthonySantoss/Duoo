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
            const storedUser = localStorage.getItem('user');

            // Se temos usuário no localStorage, já preenchemos para evitar flash de login
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch {
                    console.error('Error parsing stored user');
                }
            }

            try {
                console.log('[AuthContext] Refreshing user data from server...');
                const res = await api.get('/auth/me');
                setUser(res.data.user);
                setPartner(res.data.partner);
                setHasPartner(res.data.hasPartner);

                // Atualiza cache local
                localStorage.setItem('user', JSON.stringify(res.data.user));
            } catch (error) {
                console.error('[AuthContext] Failed to load user:', error.response?.status);
                if (error.response?.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('duoo:access-token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.token) localStorage.setItem('duoo:access-token', res.data.token);

        setUser(res.data.user);

        // Carrega dados completos (parceiro, etc)
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.user);
        setPartner(meRes.data.partner);
        setHasPartner(meRes.data.hasPartner);
        localStorage.setItem('user', JSON.stringify(meRes.data.user));
    };

    const register = async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password });
        if (res.data.token) localStorage.setItem('duoo:access-token', res.data.token);
        setUser(res.data.user);
        setPartner(null);
        setHasPartner(false);
    };

    const logout = () => {
        console.log('[AuthContext] Logging out...');
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('user');
        localStorage.removeItem('duoo:access-token');
        setUser(null);
        setPartner(null);
        setHasPartner(false);
        // Force redirect to login
        window.location.href = '/login';
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

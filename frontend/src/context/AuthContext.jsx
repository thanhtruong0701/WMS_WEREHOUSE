import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'wms_token';
const USER_KEY = 'wms_user';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    });

    const login = useCallback((tokenValue, userData) => {
        localStorage.setItem(TOKEN_KEY, tokenValue);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(tokenValue);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const isAuthenticated = !!token && !!user;
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'admin' || user?.role === 'staff';

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, isAdmin, isStaff }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

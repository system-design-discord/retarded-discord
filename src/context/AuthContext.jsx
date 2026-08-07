import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // کاربر ماک پیش‌فرض برای دسترسی مستقیم
    const [user, setUser] = useState({ id: 1, username: 'امیر', isAuthenticated: true });
    const [loading, setLoading] = useState(false);

    const login = async (username, password) => {
        try {
            const response = await api.post('auth/login/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            setUser({ id: response.data.id || 1, username: username, isAuthenticated: true });
            return response.data;
        } catch (error) {
            console.warn("بک‌اند متصل نیست. ورود با کاربر ماک انجام شد.");
            const mockUser = { id: 1, username: username || 'امیر', isAuthenticated: true };
            setUser(mockUser);
            localStorage.setItem('access_token', 'mock-token');
            return { access: 'mock-token', user: mockUser };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
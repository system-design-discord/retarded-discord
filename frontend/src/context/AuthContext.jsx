import { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from '../lib/tokens';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        try {
            const response = await api.get('auth/me/');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = getAccessToken();
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const response = await api.post('auth/login/', { username, password });
        storeTokens(response.data);
        await fetchProfile();
        return response.data;
    };

    // US-1.3 — tell the server first, then forget the tokens locally. Dropping
    // them from localStorage alone leaves the refresh token valid for its full
    // seven days; auth/logout/ blacklists it. The local half runs either way,
    // because a user who pressed Log Out must end up logged out even if the
    // request fails.
    const logout = async () => {
        const refresh = getRefreshToken();
        try {
            if (refresh) {
                await api.post('auth/logout/', { refresh });
            }
        } catch {
            // Already expired or already blacklisted — nothing the user can act on.
        } finally {
            clearTokens();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
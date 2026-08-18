import { createContext, useCallback, useState, useEffect } from 'react';
import api from '../services/api';
import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from '../lib/tokens';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Read once on mount, once on login — and, since profile propagation
    // landed, once more whenever this user's own profile changes. It used to be
    // the first two only, and nothing exported it, so a rename left
    // `user.username` at whatever it was when the tab was opened and every
    // screen reading it from here was stale until a reload.
    const fetchProfile = useCallback(async () => {
        try {
            const response = await api.get('auth/me/');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = getAccessToken();
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [fetchProfile]);

    // `identifier` is an email address or a username — the endpoint resolves
    // either (#128). The body key stays `username` because that is
    // `USERNAME_FIELD`, and therefore the key simplejwt's serializer reads.
    const login = async (identifier, password) => {
        const response = await api.post('auth/login/', { username: identifier, password });
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
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser: fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
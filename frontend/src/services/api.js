import axios from 'axios';

import { API_BASE_URL } from '../lib/apiBase';
import { clearTokens, getAccessToken, getRefreshToken, refreshTokens } from '../lib/tokens';

// Re-exported so `API_BASE_URL` keeps its long-standing import path. It is
// declared in `lib/apiBase` now — see the note there for why.
export { API_BASE_URL };

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Refresh once on a 401, then replay the original request.
//
// The refresh reply carries a **new refresh token as well as a new access
// token** — `ROTATE_REFRESH_TOKENS` is on — and this used to keep only the
// access half, so the refresh token the server had just blacklisted stayed in
// storage. The next 401 presented it, was refused, and dropped the reader on
// the login screen mid-session (#141). `refreshTokens` writes both halves, and
// shares one exchange across every request that 401s at the same moment:
// presenting a rotated token twice is exactly what blacklisting refuses.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Nothing to refresh with — a plain unauthenticated call. Leave the
            // 401 to the caller rather than redirecting somebody who was never
            // logged in.
            if (!getRefreshToken()) return Promise.reject(error);

            try {
                const newAccessToken = await refreshTokens();
                if (newAccessToken) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch {
                // The refresh token is spent too. Fall through to the logout.
            }

            clearTokens();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

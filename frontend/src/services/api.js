import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/', 
});

// اضافه کردن توکن به هدر همه درخواست‌ها
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// مدیریت انقضای توکن (Refresh Token Interceptor)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // اگر ارور 401 داد و قبلاً تلاش مجدد نشده بود
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (refreshToken) {
                try {
                    const res = await axios.post('http://localhost:8000/api/auth/refresh/', {
                        refresh: refreshToken
                    });
                    
                    const newAccessToken = res.data.access;
                    localStorage.setItem('access_token', newAccessToken);
                    
                    // به‌روزرسانی توکن در درخواست اصلی و تلاش مجدد
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // اگر رفرش توکن هم منقضی شده بود، خروج کاربر
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
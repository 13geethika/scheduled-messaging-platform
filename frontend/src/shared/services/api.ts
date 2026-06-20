import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://scheduled-messaging-platform.onrender.com";//'http://localhost:8080/api' ||


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  //withCredentials: true, // Allow cookies if needed
});

// Request Interceptor: Attach JWT to authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Centrally delete default 'Content-Type' for FormData requests,
    // allowing the browser / Axios to set it dynamically with the correct boundary.
    if (config.data instanceof FormData) {
      if (config.headers.delete) {
        config.headers.delete('Content-Type');
      }
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops if refresh request itself fails with 401
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token, trigger logout
        handleLogoutRedirect();
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry original request with new access token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token expired or invalid', refreshError);
        handleLogoutRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

function handleLogoutRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Custom event to notify Redux store/components of session expiration
  window.dispatchEvent(new Event('auth-logout'));
  
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default api;

import axios from 'axios';

// Use Vite dev proxy (see vite.config.ts) and keep production configurable via reverse proxy.
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle auth errors (cookie-based auth)
if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response?.status === 401) {
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );
}

export default api;

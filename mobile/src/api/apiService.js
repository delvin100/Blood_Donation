import axios from 'axios';
import { getToken } from '../utils/storage';

const LOCAL_API_URL = 'http://192.168.137.1:4000/api';
const RENDER_API_URL = 'https://ebloodbank.onrender.com/api';

// Enforced Production Mode to bypass local networking/firewall issues
const API_BASE_URL = RENDER_API_URL;

const apiService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Log the base URL being used for debugging in development
if (__DEV__) {
    console.log(`[API] Base URL: ${API_BASE_URL}`);
}

// Request interceptor to add the auth token and standardise paths
apiService.interceptors.request.use(
    async (config) => {
        // Standardise URL: Remove leading slash to ensure baseURL path (e.g. /api) is not stripped
        if (config.url && config.url.startsWith('/') && config.baseURL) {
            config.url = config.url.substring(1);
        }

        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for better error handling
apiService.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // The request was made and the server responded with a status code 4xx/5xx
            return Promise.reject(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received (Timeout or Network Error)
            console.log('[API Network Error]', {
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                message: error.message,
                code: error.code
            });
            return Promise.reject({
                error: `Network error. Could not connect to the server at ${API_BASE_URL}. Please check your connection or server status.`
            });
        } else {
            // Something happened in setting up the request
            return Promise.reject({ error: error.message });
        }
    }
);

export default apiService;

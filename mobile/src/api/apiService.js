import axios from 'axios';
import { getToken } from '../utils/storage';

const LOCAL_API_URL = 'http://192.168.137.1:4000/api/';
const RENDER_API_URL = 'https://ebloodbank.onrender.com/api/';

// Enforced Production Mode to bypass local networking/firewall issues
// Automatically switch between local and production based on environment
const API_BASE_URL = __DEV__ ? LOCAL_API_URL : RENDER_API_URL;

const apiService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // Increased to 60s for Render cold starts
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Log the base URL being used for debugging in development
if (__DEV__) {
    console.log(`[API] Initialised with Base URL: ${API_BASE_URL}`);
}

// Request interceptor to add the auth token and standardise paths
apiService.interceptors.request.use(
    async (config) => {
        // Standardise URL: Remove leading slash to ensure baseURL path (e.g. /api) is not stripped
        if (config.url && config.url.startsWith('/') && config.baseURL) {
            config.url = config.url.substring(1);
        }

        if (__DEV__) {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
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
    (response) => {
        if (__DEV__) {
            console.log(`[API Response] ${response.status} from ${response.config.url}`);
        }
        return response;
    },
    (error) => {
        const errorDetail = {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            code: error.code
        };

        if (__DEV__) {
            console.log('[API Error Detailed]', JSON.stringify(errorDetail, null, 2));
        }

        if (error.response) {
            // The request was made and the server responded with a status code 4xx/5xx
            return Promise.reject(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received (Timeout or Network Error)
            let userMessage = `Network error. Could not connect to the server.`;

            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                userMessage = 'Connection timed out. The server might be waking up, please try again in a few seconds.';
            } else if (error.code === 'ERR_NETWORK') {
                userMessage = 'Network error. Please check your internet connection or if the server is reachable.';
            }

            return Promise.reject({
                error: userMessage,
                technical: error.message
            });
        } else {
            // Something happened in setting up the request
            return Promise.reject({ error: error.message });
        }
    }
);

export default apiService;

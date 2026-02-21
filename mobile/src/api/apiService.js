import axios from 'axios';
import { getToken } from '../utils/storage';

const LOCAL_API_URL = 'http://192.168.137.1:5000/api'; // Update port to 5000
const RENDER_API_URL = 'https://ebloodbank.onrender.com/api';

const API_BASE_URL = __DEV__ ? LOCAL_API_URL : RENDER_API_URL;
// TIP: If you want to test the Render URL on your mobile even in development, 
// just comment out the line above and use:
// const API_BASE_URL = RENDER_API_URL;

const apiService = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the auth token
apiService.interceptors.request.use(
    async (config) => {
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
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            return Promise.reject(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            return Promise.reject({ error: 'Network error. Please check your connection.' });
        } else {
            // Something happened in setting up the request that triggered an Error
            return Promise.reject({ error: error.message });
        }
    }
);

export default apiService;

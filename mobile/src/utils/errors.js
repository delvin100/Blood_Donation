/**
 * Safely parses any error object/string from the backend/network 
 * and returns a clean, user-friendly string message.
 */
export const parseError = (err) => {
    if (!err) return 'An unexpected error occurred. Please try again.';

    // If it's already a string, just return it
    if (typeof err === 'string') return err;

    // Handle axios/apiService rejected data (the backend usually sends { error: "..." })
    if (err.error && typeof err.error === 'string') {
        return err.error;
    }

    // Handle nested error data from axios (often in err.response.data)
    if (err.response?.data?.error && typeof err.response.data.error === 'string') {
        return err.response.data.error;
    }

    if (err.data?.error && typeof err.data.error === 'string') {
        return err.data.error;
    }

    // Handle standard Error objects or nested messages
    if (err.message && typeof err.message === 'string') {
        // Filter out technical messages if possible, but keep them as fallback
        if (err.message.includes('Network Error')) return 'Network error. Please check your connection.';
        if (err.message.includes('404')) return 'Requested resource not found.';
        if (err.message.includes('500')) return 'Server error. Please try again later.';
        return err.message;
    }

    // Fallback for objects that don't match the expected structure
    try {
        const str = JSON.stringify(err);
        if (str.includes('Network Error')) return 'Network error. Please check your connection.';
        if (str.includes('auth/invalid-credential')) return 'Invalid username or password.';
        return 'An error occurred. Please try again.';
    } catch (e) {
        return 'An unexpected error occurred. Please try again.';
    }
};

/**
 * Logs errors to console.log instead of console.error to avoid 
 * showing the LogBox / RedBox in React Native dev environment
 * while still keeping the error details available for developers.
 */
export const logError = (context, err) => {
    console.log(`[${context}]`, err);
};

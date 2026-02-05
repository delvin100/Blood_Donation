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

    // Handle standard Error objects or nested messages
    if (err.message && typeof err.message === 'string') {
        return err.message;
    }

    // Fallback for objects that don't match the expected structure
    try {
        // If it's a JSON-like object, we don't want to show the whole thing
        // but we can try to extract some readable part
        const str = JSON.stringify(err);
        if (str.includes('Network Error')) return 'Network error. Please check your connection.';
        return 'Invalid response from server. Please try again.';
    } catch (e) {
        return 'An error occurred. Please try again.';
    }
};

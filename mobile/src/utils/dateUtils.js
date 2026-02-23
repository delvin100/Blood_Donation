/**
 * Formats a date string or object to DD/MM/YYYY format
 * @param {Date|string} dateInput 
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

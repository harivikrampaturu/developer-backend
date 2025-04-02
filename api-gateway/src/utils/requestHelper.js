/**
 * Get the full URL of the request
 * @param {Object} req - The request object
 * @returns {string} The full URL of the request
 */
export const getRequestFullUrl = (req) => `${req.protocol}://${req.headers.host}${req.originalUrl}`;

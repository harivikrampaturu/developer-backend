import logger from 'a-logger';
import { statusCodes } from 'http-status-codes';
import { getRequestFullUrl } from '../utils/requestHelper';
import { RESPONSE_MSGS } from '../utils/responseMessages';
import { ERROR_CODES } from '../utils/errorCodes';
import { getRoutingConfig } from '../config';
import { authenticationMiddleware } from './authHandler';
import { proxyMiddleware } from './proxyHandler';

/**
 * Fetch routing configuration middleware to fetch the routing configuration for a service
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const fetchRoutingConfigMiddleware = (req, res, next) => {
    const tag = 'fetchRoutingConfigMiddleware';
    const { originalUrl = '', logMeta = {}, headers } = req;
    const actualPath = originalUrl;
    const urlTokens = String(actualPath).split('/');
    const service = urlTokens[1];
    const { exists, routingConfig } = getRoutingConfig(service);
    if (!exists) {
        const fullUrl = getRequestFullUrl(req);
        logger.error(tag, `Bad service call: ${service} || Full URL: ${fullUrl} || Path: ${actualPath} || Headers: ${JSON.stringify(headers)}`, logMeta);
        return res.status(statusCodes.NOT_FOUND).json({
            message: RESPONSE_MSGS.INVALID_SERVICE_ROUTE,
            errorCode: ERROR_CODES.ERROR_NOT_FOUND
        });
    }
    res.locals = {
        actualPath,
        routingConfig,
        OriginalHost: req.get('host'),
        OriginalUrl: req.originalUrl
    };
    return next();
};

/**
 * Check deprecation middleware to check if the endpoint is deprecated
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const checkDeprecationMiddleware = (req, res, next) => {
    const tag = 'checkDeprecationMiddleware';
    const { logMeta = {} } = req;
    const {
        actualPath,
        routingConfig: { isDeprecated = false }
    } = res.locals;
    if (isDeprecated) {
        logger.error(tag, `User is trying for deprecated endpoint so returning as not found || Path: ${actualPath}`, logMeta);
        return res.status(statusCodes.NOT_FOUND).json({
            message: RESPONSE_MSGS.DEPRECATED_ROUTE,
            errorCode: ERROR_CODES.ERROR_DEPRECATED_ROUTE
        });
    }
    return next();
};

/**
 * Handle routes middleware to handle the routes
 * @returns {Array} The middleware functions
 */
export const handleRoutes = () => [
    fetchRoutingConfigMiddleware,
    checkDeprecationMiddleware,
    authenticationMiddleware,
    proxyMiddleware,
];

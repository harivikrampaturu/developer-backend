import logger from 'a-logger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { StatusCodes } from 'http-status-codes';
import { RESPONSE_MSGS } from '../utils/responseMessages';
import { ERROR_CODES } from '../utils/errorCodes';

/**
 * On proxy error handler to handle the proxy error
 * @param {Object} err - The error object
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Object} target - The target object
 */
export const onProxyErrorHandler = (err, req, res, target) => {
    const tag = 'onProxyErrorHandler';
    const requestID = logger.getRequestID();
    const { code } = err;
    logger.error(tag, `Error while serving proxy || Target: ${target.href || ''} || RequestID: ${requestID} || ErrorCode: ${code} || Error: ${err?.message ?? JSON.stringify(err)}`);
    if (res.writeHead && !res.headersSent) {
        let statusCode = StatusCodes.GATEWAY_TIMEOUT;
        switch (code) {
            case 'ECONNRESET':
            case 'ENOTFOUND':
            case 'ECONNREFUSED':
            case 'ETIMEDOUT':
                statusCode = StatusCodes.GATEWAY_TIMEOUT;
                break;
            default:
                statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        }
        res.status(statusCode).json({
            message: RESPONSE_MSGS.SOME_THING_WENT_WRONG,
            errorCode: ERROR_CODES.ERROR_WRONG_AT_SERVER,
            errorInfo: {
                requestID
            }
        });
    }
};

/**
 * Check if the path filter is valid
 * @param {Object} pathFilter - The path filter object
 * @returns {boolean} True if the path filter is valid, false otherwise
 */
const isValidPathFilter = (pathFilter) => {
    if (typeof pathFilter === 'string') {
        return true;
    }
    if (typeof pathFilter === 'function') {
        return true;
    }
    if (Array.isArray(pathFilter) && pathFilter.length) {
        return true;
    }
    return false;
};

/**
 * Proxy middleware to handle the proxy requests
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const proxyMiddleware = async (req, res, next) => {
    const tag = 'proxyMiddleware';
    const { logMeta = {} } = req;
    const {
        actualPath,
        routingConfig: { proxyOptions },
        OriginalHost,
        OriginalUrl
    } = res.locals;

    req.headers.OriginalHost = OriginalHost;
    req.headers.OriginalUrl = OriginalUrl;

    if (!proxyOptions) {
        // When there are no proxy to implemented
        // Continuing for next handler
        next();
        return;
    }
    proxyOptions.onError = onProxyErrorHandler;
    try {
        const { pathFilter } = proxyOptions;
        let proxy;
        if (isValidPathFilter(pathFilter)) {
            proxy = createProxyMiddleware(pathFilter, proxyOptions);
        } else {
            proxy = createProxyMiddleware(proxyOptions);
        }
        const start = new Date();
        // Note: below code has await keyword and for that eslint will warn us
        // 'await' has no effect on the type of this expression
        // Please ignore this and keep the await keyword since its a promise
        // To calculate time taken for the proxy response and logger functionalities to work
        await proxy(req, res, next);
        const end = new Date();
        const duration = end - start;
        logger.debug(tag, `Time taken for proxy || Path: ${actualPath} || Duration: ${duration}ms`, logMeta);
    } catch (error) {
        logger.error(tag, `Error while serving proxy || Error: ${JSON.stringify(error.message || error)}`, logMeta);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: RESPONSE_MSGS.PROXY_FAILED,
            errorCode: ERROR_CODES.ERROR_PROXY_FAILED
        });
    }
};

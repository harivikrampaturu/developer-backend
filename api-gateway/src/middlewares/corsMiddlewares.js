import logger from 'a-logger';
import statusCodes from 'http-status-codes';
import axios from 'axios';
import { RESPONSE_MSGS } from '../utils/responseMessages';
import { ERROR_CODES } from '../utils/errorCodes';
import { ALLOWED_ORIGINS } from '../config';

const isValidOrigin = async (origin, authorization) => {
    const tag = 'isValidOrigin';
    console.log('Valid origin Called');
    try {
        if (ALLOWED_ORIGINS.includes(origin)) return true;
        if (!authorization) return false;
        const token = authorization.split('Bearer ')[1];
        if (!token || token.length > 40) return false;
        const response = await axios.get(`http://localhost:8500/authentication/validate-key/${token}`);
        const user = response.data.data;
        if (!user) return false;
        const allowedOrigins = user.allowedOrigins || [];
        if (!allowedOrigins.length) return true; // allow all origins
        return allowedOrigins.includes(origin);
    } catch (error) {
        logger.error(tag, `failed: ${error?.message ?? JSON.stringify(error)}`);
        return false;
    }
};

export const corsMiddleware = async (req, res, next) => {
    const tag = 'corsMiddleware';
    const { origin, authorization = '' } = req?.headers || {}; // Safe destructuring
    const { originalUrl = '', logMeta = {} } = req || {}; // Safe destructuring

    if (!req || !req.headers) {
        logger.error(tag, `Invalid request object || Path: ${originalUrl}`, logMeta);
        return res.status(statusCodes.BAD_REQUEST).json({
            message: 'Bad request. Missing headers.'
        });
    }

    if (origin) {
        // Your origin validation logic here
        if (await isValidOrigin(origin, authorization)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, Cache-Control, X-Requested-With');
            res.set('Access-Control-Allow-Credentials', 'true');
        } else {
            logger.error(tag, `Unverified origin || Origin: ${origin} || Path: ${originalUrl}`, logMeta);
            return res.status(statusCodes.UNAUTHORIZED).json({
                message: RESPONSE_MSGS.UNAUTHORIZED,
                errorCode: ERROR_CODES.ERROR_UNAUTHORIZED
            });
        }
    } else {
        // Handle cases where origin is missing
        logger.warn(tag, `Origin missing || Path: ${originalUrl}`, logMeta);
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end(); // Pre-flight request response
    }

    return next();
};

import logger from 'a-logger';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { ERROR_CODES } from '../utils/errorCodes';
import { JWT_SECRET_KEY, COOKIE_NAME } from '../config';

/**
 * Authentication middleware to handle the authentication
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const authenticationMiddleware = async (req, res, next) => {
    const tag = 'authenticationMiddleware';
    console.log('Authentication Handler Called');
    const { logMeta = {}, headers } = req;
    console.log('LogMeta ', logMeta, 'Headers :', headers);
    console.log('Locals :', res.locals);
    const {
        actualPath,
        routingConfig: { checkAuthentication }
    } = res.locals;

    if (!checkAuthentication) {
        // Public endpoint
        return next();
    }

    // Check token from cookies first
    let token = req.cookies?.[COOKIE_NAME];

    // Check authorization header if token not found in cookies
    if (!token) {
        const { authorization } = req.headers;
        if (authorization && authorization.startsWith('Bearer ')) {
            // eslint-disable-next-line prefer-destructuring
            token = authorization.split('Bearer ')[1];
        }
    }

    if (!token) {
        logger.error(tag, `Missing token || Route: ${actualPath} || Headers: ${JSON.stringify(headers)}`, logMeta);
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'Token is required.',
            errorCode: ERROR_CODES.ERROR_TOKEN_MISSING
        });
    }

    if (token.length === 36) {
        try {
            const response = await axios.get(`http://localhost:8500/authentication/validate-key/${token}`);
            const { name, key, uuid, teamId, allowedOrigins, isPublic } = response.data.data;
            const userDetails = {
                name,
                key,
                userId: uuid,
                teamId,
                isPublic,
                allowedOrigins
            };
            if (response.data.status === true) {
                req.headers = {
                    ...req.headers,
                    userDetails
                };
                return next();
            }
        } catch (error) {
            logger.error('Token Validation', `Error while validating token`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: 'Api Key is Invalid or Expired'
            });
        }
    }

    try {
        /**
         * Decode the token
         * @param {string} token - The token to decode
         * @param {string} JWT_SECRET_KEY - The secret key to decode the token
         * @returns {Object} The decoded token
         */
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        req.user = decoded;
        const { _id, teamId } = decoded;
        const userDetails = {
            userId: _id,
            teamId
        };
        req.headers = {
            ...req.headers,
            userDetails
        };
        logger.info(tag, `Headers: ${JSON.stringify(req.headers)}`);
        return next();
    } catch (err) {
        logger.error(tag, `Invalid token || Route: ${actualPath} || Error: ${err.message}`, logMeta);
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'Invalid or expired token.',
            errorCode: ERROR_CODES.ERROR_INVALID_TOKEN
        });
    }
};

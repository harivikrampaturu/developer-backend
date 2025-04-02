import jwt from 'jsonwebtoken';
import logger from 'a-logger';
import Users from '../database/models/Users';
import { COOKIE_NAME, JWT_SECRET_KEY } from '../config/config';
import ApiKeys from '../database/models/ApiKeys';

/**
 * Token validation middleware to validate the token
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
const tokenValidation = async (req, res, next) => {
    const sourceTag = 'token Validation';
    try {
        let token = req.cookies?.[COOKIE_NAME];

        // If not found in cookies, check the Authorization header
        if (!token) {
            const { authorization } = req.headers;
            if (authorization && authorization.startsWith('Bearer ')) {
                // eslint-disable-next-line prefer-destructuring
                token = authorization.split('Bearer ')[1];
            }
        }

        // If the token is still not found, return a missing token error
        if (!token) {
            return res.status(404).json({
                message: 'Token is Missing'
            });
        }

        if (token.length === 36) {
            const isExists = await ApiKeys.findOne({ key: token });

            if (!isExists) {
                return res.status(400).json({ message: 'Invalid API Key' });
            }

            const expiresAtTimestamp = new Date(isExists.expiresAt).getTime();
            const currentTimestamp = Date.now();

            if (expiresAtTimestamp <= currentTimestamp) {
                return res.status(401).json({ message: 'API Key has expired' });
            }

            req.user = isExists;
            return next();
        }
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET_KEY);
            logger.info(sourceTag, 'Payload', payload);
        } catch (error) {
            return res.status(400).json({
                message: 'Token is Invalid or Expired'
            });
        }

        const u = await Users.findById(payload._id);

        if (!u) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        req.user = payload;
        next();
    } catch (error) {
        logger.error(sourceTag, 'Token Validation Error:', JSON.stringify(error?.message || error));
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export default tokenValidation;

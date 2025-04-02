import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import logger from 'a-logger';
import Users from '../../database/models/Users';
import { isUserExits } from '../../utils/helpers';
import { COOKIE_NAME, JWT_SECRET_KEY } from '../../config/config';
import Teams from '../../database/models/Teams';
import ApiKeys from '../../database/models/ApiKeys';

/**
 * Welcome handler to send a welcome message
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const welcomeHandler = (req, res) => {
    const { _id } = req.user;
    const sourceTag = 'welcomeHandler';
    logger.info(sourceTag, 'Welcome handler', _id);
    res.send('Welcome Handler');
};

/**
 * List users handler to retrieve all users
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const listUsersHandler = async (req, res) => {
    const sourceTag = 'listUsersHandler';
    try {
        const response = await Users.find({});
        return res.status(StatusCodes.OK).json({
            message: 'Users Listed Successfully...',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, 'Error While Listing Users ', JSON.stringify(error?.message || error));
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error while creating user'
        });
    }
};

/**
 * Create user handler to create a new user
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const createUserHandler = async (req, res) => {
    const sourceTag = 'createUserHandler';
    try {
        // eslint-disable-next-line object-curly-newline
        const { firstName, lastName, email, password } = req.body;
        const rounds = 10;

        if (!firstName || !lastName || !email || !password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Please, Enter required fields.'
            });
        }

        const existingUser = await Users.findOne({ email });

        if (existingUser) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'User already exists with this email'
            });
        }

        let team = await Teams.findOne({ name: 'Meeami' });
        if (!team) {
            team = await Teams.create({ name: 'Meeami' });
        }
        const teamId = team._id;

        /**
         * Encrypt the password
         * @param {string} password - The password to encrypt
         * @param {number} rounds - The number of rounds to use for the encryption
         * @returns {Promise<string>} The encrypted password
         */
        const encryptedPassword = await bcrypt.hash(password, rounds);

        const response = await Users.create({
            teamId,
            firstName,
            lastName,
            email,
            password: encryptedPassword
        });

        response.password = undefined;

        return res.status(StatusCodes.CREATED).json({
            message: 'User is created successfully.',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, 'Error while Creating User', JSON.stringify(error?.message || error));
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While Creating User'
        });
    }
};

/**
 * Token validation handler to validate the token
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const tokenValidationHandler = async (req, res) => {
    const sourceTag = 'tokenValidationHandler';
    try {
        let token = req.cookies?.[COOKIE_NAME];

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

        // Handle API Key authentication
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

            return res.json({ valid: true, user: isExists });
        }

        // Handle JWT authentication
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET_KEY);
        } catch (error) {
            return res.status(400).json({ message: 'Token is Invalid or Expired' });
        }

        const user = await Users.findById(payload._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.json({ valid: true, user: payload });
    } catch (error) {
        logger.error(sourceTag, `Token Validation Error: ${error || error.message}`);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * List user by ID handler to retrieve user details by ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const listUserByIdHandler = async (req, res) => {
    const sourceTag = 'listUserByIdHandler';
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'User Id is not exists.'
            });
        }

        const response = await Users.findById(userId);
        if (!response) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'User not exists'
            });
        }
        return res.status(StatusCodes.OK).json({
            message: 'User listed successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error while listing User By Id detail ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Id is not exists'
        });
    }
};

/**
 * Update user handler to update user details
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const updateUserhandler = async (req, res) => {
    const sourceTag = 'updateUserhandler';
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'User ID is missing'
            });
        }

        const exists = await isUserExits(userId);

        if (!exists) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'User not exists'
            });
        }

        // eslint-disable-next-line object-curly-newline
        const { firstName, lastName, email } = req.body;

        if (!firstName || !lastName || !email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Please enter required fields'
            });
        }

        // const encryptedPassword = await bcrypt.hash(password, rounds);

        const response = await Users.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                email
            },
            { new: true }
        );

        return res.status(StatusCodes.OK).json({
            message: 'User is updated successfully.',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While updating user ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'User is not updated successfully..'
        });
    }
};

/**
 * Delete user handler to delete a user by ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const deleteUserHandler = async (req, res) => {
    const sourceTag = 'deleteUserHandler';
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'User Id is missing'
            });
        }

        const exists = await isUserExits(userId);

        if (!exists) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'User not exists'
            });
        }

        const response = await Users.findByIdAndDelete(userId);

        return res.status(StatusCodes.OK).json({
            message: 'User is deleted Successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While deleting User || Error ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While deleting user'
        });
    }
};

/**
 * Get profile details handler to retrieve user details
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const getProfileDetailsHandler = async (req, res) => {
    const { _id, teamId } = req.user;
    const user = await Users.findOne({ _id, teamId });

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            message: 'User not Exists'
        });
    }

    const { firstName, lastName, email } = user;

    return res.status(StatusCodes.OK).json({
        message: 'User Details',
        data: {
            _id,
            teamId,
            firstName,
            lastName,
            email
        }
    });
};

/**
 * Login handler to authenticate user and create a JWT token
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const loginHandler = async (req, res) => {
    const sourceTag = 'loginHandler';

    try {
        const { email, password } = req.body;

        // Validate if email and password are provided
        if (!email || !password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Please enter both email and password.'
            });
        }

        // Find user by email
        const user = await Users.findOne({ email });

        // If user doesn't exist, return error
        if (!user) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Invalid email or password.'
            });
        }

        // Compare password with hashed password stored in DB
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // If password is invalid, return error
        if (!isPasswordValid) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Invalid email or password.'
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                _id: user._id,
                teamId: user.teamId
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        const tokenToStore = process.env.ENVIRONMENT === 'local' ? 'jwt-dev' : 'jwt';

        // Cookie options based on environment
        const authCookieOptions = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            path: "/",
            httpOnly: true,
            sameSite: 'None',
            secure: true
        };
        res.set('Access-Control-Allow-Credentials', 'true').status(200).cookie(tokenToStore, token, authCookieOptions);

        return res.status(StatusCodes.OK).json({
            message: 'User logged in successfully.',
            token,
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        // Log the error with a source tag for easier debugging
        logger.error(sourceTag, `Error while logging In || Error: ${error?.message || error}`);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Internal Server Error. Please try again later.'
        });
    }
};

/**
 * Logout handler to clear the authentication cookie
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const logoutHandler = async (req, res) => {
    const sourcetag = 'logoutHandler';
    try {
        if (!req.cookies[COOKIE_NAME]) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Cookie is missing'
            });
        }
        res.clearCookie(COOKIE_NAME);
        return res.status(StatusCodes.OK).json({
            message: 'Cookie has been cleared'
        });
    } catch (error) {
        logger.error(sourcetag, `Error While Clearing Cookie`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Internal Server Error'
        });
    }
};

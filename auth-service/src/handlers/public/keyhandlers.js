import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';
import logger from 'a-logger';
import ApiKeys from '../../database/models/ApiKeys';

/**
 * List API keys handler to retrieve all API keys for a team
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const listApiKeysHandler = async (req, res) => {
    const sourceTag = 'listApiKeysHandler';
    try {
        const { teamId } = req.user;
        const response = await ApiKeys.find({ teamId });
        return res.status(StatusCodes.OK).json({
            message: 'Api Key is listed Successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While creating Api Key || Error: ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While Listing Api Key'
        });
    }
};

/**
 * Create API key handler to create a new API key
 */
export const createApiKeyHandler = async (req, res) => {
    const sourceTag = 'createApiKeyHandler';
    const today = new Date();
    try {
        const { _id, teamId } = req.user;
        const { name, isActive, isPublic, allowedOrigins = [] } = req.body;

        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Please Enter required fields'
            });
        }
        if (isPublic === false) {
            if (allowedOrigins.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: 'Please Enter allowed origins'
                });
            }
        }

        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const response = await ApiKeys.create({
            teamId,
            uuid: _id,
            name,
            key: uuidv4(),
            expiresAt: sevenDaysLater.toISOString(),
            isActive,
            isPublic,
            allowedOrigins
        });

        return res.status(StatusCodes.OK).json({
            message: 'Api Key is created',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error while creating Api key || Error: ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error while creating Api key'
        });
    }
};

/**
 * Get API key by ID handler to retrieve a specific API key by its ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const getApiKeyById = async (req, res) => {
    const sourceTag = 'getApiKeyById';
    try {
        const { apikeyId } = req.params;

        if (!apikeyId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const isExists = ApiKeys.findOne({ _id: apikeyId });

        if (!isExists) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const response = await ApiKeys.findById(apikeyId);

        return res.status(StatusCodes.OK).json({
            message: 'Api Key is listed successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While fetch Apikey By ID || Error:  ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While fetching data'
        });
    }
};

/**
 * Validate API key handler to validate the API key
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const validateApiKeyHandler = async (req, res) => {
    const sourceTag = 'validateApiKey';
    try {
        const { apikeyId } = req.params;

        if (!apikeyId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const isExists = await ApiKeys.findOne({ key: apikeyId });

        if (!isExists) {
            return res.status(400).json({ message: 'Invalid API Key' });
        }

        const expiresAtTimestamp = new Date(isExists.expiresAt).getTime();
        const currentTimestamp = Date.now();

        if (expiresAtTimestamp <= currentTimestamp) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'API Key has expired' });
        }

        return res.status(StatusCodes.OK).json({
            message: 'Api Key is listed successfully',
            status: true,
            data: isExists
        });
    } catch (error) {
        logger.error(sourceTag, `Error While fetch Apikey By ID || Error:  ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While fetching data'
        });
    }
};

/**
 * Update API key handler to update an existing API key
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const updateApiKeyHandler = async (req, res) => {
    const sourceTag = 'updateApiKeyHandler';
    try {
        const { apikeyId } = req.params;
        const { name, expiresAt, isActive, isPublic, allowedOrigins } = req.body;

        if (!apikeyId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Please enter required fields'
            });
        }

        if (isPublic === false && (!allowedOrigins || allowedOrigins.length === 0)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Please provide at least one allowed origin when 'isPublic' is false."
            });
        }

        const isExists = await ApiKeys.findById(apikeyId);

        if (!isExists) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const response = await ApiKeys.findByIdAndUpdate(
            apikeyId,
            {
                name,
                expiresAt,
                isActive,
                isPublic,
                allowedOrigins
            },
            { new: true }
        );

        return res.status(StatusCodes.OK).json({
            message: 'Api Key is updated successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While updating apikey || Error: ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While Updating Api Key'
        });
    }
};

/**
 * Delete API key handler to delete an existing API key
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const deleteApiKeyHandler = async (req, res) => {
    const sourceTag = 'deleteApiKeyhandler';
    try {
        const { apikeyId } = req.params;

        if (!apikeyId) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const isExists = await ApiKeys.findById(apikeyId);

        if (!isExists) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Id is not exists'
            });
        }

        const response = await ApiKeys.findByIdAndDelete(apikeyId);

        return res.status(StatusCodes.OK).json({
            message: 'Api Key is deleted successfully',
            data: response
        });
    } catch (error) {
        logger.error(sourceTag, `Error While Deleting Api Key || Error: ${JSON.stringify(error?.message || error)}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While Deleting Api Key'
        });
    }
};

import axios from "axios";
// eslint-disable-next-line import/no-extraneous-dependencies
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
// eslint-disable-next-line import/no-extraneous-dependencies
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "a-logger";
import {
    AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_SECRET_ACCESS_KEY, COOKIE_NAME, REGION,
} from "../config/config";

/**
 * S3 client to upload files to S3
 */
const s3 = new S3Client({
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
    region: REGION,
});

/**
 * Authenticate request to authenticate the request
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
export const authenticateRequest = async (req, res, next) => {
    const sourceTag = "authenticateRequest";
    try {
        let token = req.cookies?.[COOKIE_NAME];

        if (!token) {
            const { authorization } = req.headers;
            if (authorization && authorization.startsWith('Bearer ')) {
                // eslint-disable-next-line prefer-destructuring
                token = authorization.split('Bearer ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ message: "Token is Missing" });
        }

        logger.info(sourceTag, `Token : ${token}`);

        const authServiceURL = "http://localhost:8501/validate-token";

        const response = await axios.get(authServiceURL, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.valid) {
            req.user = response.data.user;
            return next();
        }

        return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
        logger.error(sourceTag, "Token validation failed:", error?.message || error);
        return res.status(401).json({ message: "Invalid or Expired Token" });
    }
};

/**
 * Signed URL to generate a signed URL for a file
 * @param {string} fileName - The name of the file
 * @returns {Promise<string>} The signed URL
 */
export const signedUrl = async (fileName) => {
    const sourceTag = "signedUrl";
    try {
        const params = {
            Bucket: AWS_BUCKET_NAME,
            Key: `uploads/${fileName}`,
        };

        // Create a new GetObjectCommand
        const command = new GetObjectCommand(params);

        // Generate signed URL using the getSignedUrl function
        const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutes expiration

        return url; // Return the signed URL
    } catch (err) {
        logger.error(sourceTag, 'Error generating signed URL:', JSON.stringify(err.message || err));
        throw new Error(err.message); // Throw an error to be caught by calling functions
    }
};

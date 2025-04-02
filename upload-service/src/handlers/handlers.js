import { StatusCodes } from 'http-status-codes';
// eslint-disable-next-line import/no-extraneous-dependencies
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Reader, Writer } from 'wav';
import logger from 'a-logger';
import Audio from '../database/models/Audio';
import { AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_SECRET_ACCESS_KEY, REGION } from '../config/config';
import { signedUrl } from '../utils/helpers';
import { noiseSuppressor } from '../modules/mvns';
import { S3UploadStream } from '../modules/uploads';

/**
 * S3 client to upload files to S3
 */
const s3 = new S3Client({
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    },
    region: REGION
});

/**
 * Timer function to delay the execution of a function
 * @param {number} ms - The number of milliseconds to delay
 * @returns {Promise} A promise that resolves after the delay
 */
const timer = (ms) => new Promise((resolve) => {
    setTimeout(() => {
        resolve();
    }, ms);
});

/**
 * Upload file handler to upload a file to S3
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const uploadFileHandler = async (req, res) => {
    const sourceTag = 'uploadFileHandler';
    try {
        const { teamId } = req.user;
        let { mvns = 1, dgc = 1, bvs = 1 } = req.query;

        mvns = parseInt(mvns);
        dgc = parseInt(dgc);
        bvs = parseInt(bvs);

        // Check if file is uploaded in the request
        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: 'No files were uploaded.'
            });
        }

        // Create the initial audio entry with status "in-progress"
        const audio = await Audio.create({
            teamId,
            status: 'in-progress',
            originalName: req.file.originalname
        });

        const uniqueFileName = `${uuidv4()}-${req.file.originalname}`;

        // Use a function to process the file asynchronously
        const processFile = async () => {
            const framesz = 160;
            const mvnsFlag = mvns;
            const dgcFlag = dgc;
            const bvsFlag = bvs;
            const fileData = req.file.buffer;
            const r = new Reader({});
            const pcmArr = [];

            r.on('format', (format) => {
                logger.info(sourceTag, 'Format: ', format);
            });
            r.once('data', (data) => {
                pcmArr.push(data);
            });
            r.write(fileData);
            r.push(null);

            r.once('end', () => {
                logger.info(sourceTag, 'end');
            });

            await timer(500);
            const pcmData = Buffer.concat(pcmArr);

            const outputFileStream = new Writer({
                sampleRate: 8000,
                channels: 1
            });
            const uploadStream = new S3UploadStream(`uploads/${uniqueFileName}`);
            outputFileStream.pipe(uploadStream);
            outputFileStream.on('error', (err) => {
                logger.info(sourceTag, ` outputFileStream error ${err || err.message}`);
            });

            const ns = noiseSuppressor(
                (data) => {
                    if (!outputFileStream.closed) {
                        outputFileStream.write(data, () => {});
                    }
                },
                {},
                mvnsFlag,
                dgcFlag,
                bvsFlag,
                null,
                {}
            );

            // Write 160 samples at a time
            let offset = pcmData.byteOffset;
            for (let i = 0; i < pcmData.length; i += framesz) {
                try {
                    if (i + framesz >= pcmData.length) {
                        break;
                    }
                    ns.write(new Int16Array(pcmData.buffer, offset, framesz));
                    offset += framesz + framesz;
                } catch (error) {
                    logger.info(sourceTag, 'Internal Server Error.', error, 'size', i);
                    break;
                }
            }

            ns.close();
            outputFileStream?.end(() => {});

            // After file processing is done, update the audio record
            try {
                // Update the audio record in the database with status "Completed"
                audio.status = 'completed';
                audio.filename = uniqueFileName;
                audio.path = `https://${AWS_BUCKET_NAME}.s3.${REGION}.amazonaws.com/uploads/${uniqueFileName}`;

                await audio.save();

                logger.info(sourceTag, "Audio record updated with status 'Completed' and path:", audio.path);
            } catch (uploadError) {
                logger.error(sourceTag, 'Error during file upload to S3:', uploadError);

                // Update audio status to failed in case of upload error
                audio.status = 'failed';
                await audio.save();

                logger.error(sourceTag, 'Error while uploading audio:', uploadError);
            }
        };

        // Start file processing asynchronously
        processFile();

        // Send an immediate response to inform the client
        return res.status(200).json({
            message: 'File is uploaded successfully and will be processed shortly.'
        });
    } catch (error) {
        logger.error(sourceTag, 'Error while handling the file upload:', JSON.stringify(error?.message || error));

        return res.status(500).json({
            status: false,
            message: 'An error occurred while uploading the audio file.',
            error: error.message
        });
    }
};

/**
 * Function to delete the file from S3
 * @param {string} fileKey - The key of the file to delete
 */
const deleteFileFromS3 = async (fileKey) => {
    const sourceTag = 'deleteFileFromS3';
    const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: fileKey
    };

    try {
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
        logger.info(sourceTag, 'File deleted successfully from S3');
    } catch (error) {
        logger.error(sourceTag, `Error deleting file from S3: ${error?.message || error}`);
        throw new Error('Error deleting file from S3');
    }
};

/**
 * Get signed URL handler to generate a signed URL for a file
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const getSignedUrl = async (req, res) => {
    const sourceTag = 'getSignedUrl';
    try {
        const fileName = req.query.file;

        if (!fileName) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'File is missing'
            });
        }

        const url = await signedUrl(fileName);

        return res.status(200).json({
            status: true,
            message: 'Signed URL generated successfully.',
            signedUrl: url
        });
    } catch (error) {
        logger.error(sourceTag, 'Error While Getting Signed URL :', JSON.stringify(error.message || error));
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error While Getting Signed URL'
        });
    }
};

/**
 * Delete file handler to delete a file from S3
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const deleteFileHandler = async (req, res) => {
    const sourceTag = 'deleteFileHandler';
    try {
        const { fileId } = req.params;

        // Find the audio file record in the database
        const audio = await Audio.findById(fileId);
        if (!audio) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: 'Audio file not found.'
            });
        }

        // Construct the file key to delete from S3
        const fileKey = `uploads/${audio.filename}`;

        // Delete the file from S3
        await deleteFileFromS3(fileKey);

        // Remove the audio record from the database
        await Audio.findByIdAndDelete(fileId);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: 'Audio file deleted successfully.'
        });
    } catch (err) {
        logger.error(sourceTag, `Error while deleting audio: ${err || err.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: 'An error occurred while deleting the audio file.',
            error: err.message
        });
    }
};

/**
 * List file handler to list all files for a team
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const listFileHandler = async (req, res) => {
    const sourceTag = 'listByIdFileHandler';
    try {
        const { teamId } = req.user;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Fetching the files from the database with pagination
        const response = await Audio.find({ teamId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

        // Fetching the total count of records for pagination
        const totalCount = await Audio.countDocuments({ teamId });

        logger.info(sourceTag, `Fetched ${response.length} files`);

        return res.status(StatusCodes.OK).json({
            message: 'Files Listed Successfully',
            data: response,
            totalCount,
            page,
            limit
        });
    } catch (error) {
        logger.error(sourceTag, `Error while listing files: ${error || error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Internal Server Error While Listing Files'
        });
    }
};


/**
 * List file by ID handler to list a file by its ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export const listByIdFileHandler = async (req, res) => {
    const sourceTag = 'listByIdFileHandler';
    try {
        // Extracting the Id from the request parameters
        const { Id } = req.params;
        logger.info(sourceTag, `Request for Audio File with ID: ${Id}`);

        // Checking if Id exists
        if (!Id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Id is missing or invalid'
            });
        }

        // Fetching the audio file by Id
        const audio = await Audio.findById(Id);

        // If no audio file is found with the given Id
        if (!audio) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: 'Audio file not found for the provided ID'
            });
        }

        // If the filename is available, generate a signed URL
        if (audio.filename && audio.filename.trim() !== '') {
            const url = await signedUrl(audio.filename);
            return res.status(StatusCodes.OK).json({
                status: true,
                message: 'Signed URL generated successfully.',
                signedUrl: url
            });
        }

        // If the filename is not provided or is empty
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: 'Audio file does not have a valid filename.'
        });
    } catch (error) {
        logger.error(sourceTag, `Error While Listing File By ID: ${error.message || error}`);

        // Handling server errors gracefully
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: 'An error occurred while fetching the audio file by ID.',
            error: error.message || 'Unknown error' // Sending detailed error message for debugging
        });
    }
};

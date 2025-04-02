import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line object-curly-newline
import { deleteFileHandler, getSignedUrl, listByIdFileHandler, listFileHandler, uploadFileHandler } from './handlers';
import { authenticateRequest } from '../utils/helpers';

const router = Router();

/**
 * Storage for multer to store the uploaded file in memory
 */
const storage = multer.memoryStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});

/**
 * File filter for multer to filter the uploaded file
 * @param {Object} req - The request object
 * @param {Object} file - The uploaded file
 * @param {Function} cb - The callback function
 */
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only audio files are allowed!'), false);
    }
};

/**
 * Upload for multer to upload the file
 */
const upload = multer({ storage, fileFilter });

router.get('/uploads', authenticateRequest, listFileHandler);
router.get('/uploads/:Id', authenticateRequest, listByIdFileHandler);
router.post('/uploads', authenticateRequest, upload.single('file'), uploadFileHandler);
router.delete('/uploads/:fileId', authenticateRequest, deleteFileHandler);

router.get('/generate-signed-url', authenticateRequest, getSignedUrl);

export default router;

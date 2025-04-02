import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

export const SERVICE_NAME = 'upload-service';
export const PORT = 8502;
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const SERVICE_ID = process.env.SERVICE_ID || randomUUID();
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/developer-portal';
export const ENVIRONMENT = process.env.ENVIRONMENT || 'local';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || 24 * 60 * 60 * 1000;
export const COOKIE_NAME = process.env.COOKIE_NAME || 'jwt';
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const REGION = process.env.REGION || '';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || [];

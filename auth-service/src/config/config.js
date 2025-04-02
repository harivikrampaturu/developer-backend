import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

export const SERVICE_NAME = 'auth-service';
export const PORT = 8501;
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'MEEAMI123@';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const SERVICE_ID = process.env.SERVICE_ID || randomUUID();
export const ENVIRONMENT = process.env.ENVIRONMENT || 'local';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || 24 * 60 * 60 * 1000;
export const COOKIE_NAME = process.env.COOKIE_NAME || 'jwt';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || 'localhost';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || [];

export const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/developer-portal";

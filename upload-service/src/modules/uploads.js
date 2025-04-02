/* eslint-disable import/no-extraneous-dependencies */
import { Writable } from 'stream';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import logger from 'a-logger';
import { AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_SECRET_ACCESS_KEY, REGION } from '../config/config';

/**
 * S3 upload stream to upload a file to S3
 */
export class S3UploadStream extends Writable {
    constructor(key, metadata) {
        super({});
        this.tag = 'S3UploadStream';
        const creds = {
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            },
            region: REGION
        };
        this.bucketName = AWS_BUCKET_NAME;
        this.objectKey = key;
        this.uploadId = null;
        this.partNumber = 1;
        this.tags = [];
        this.buffer = Buffer.alloc(0);
        this.minPartSize = 5 * 1024 * 1024; // 5 MB
        this.s3 = new S3Client(creds);
        this.metadata = metadata;
    }

    async _initUpload() {
        const command = new CreateMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: this.objectKey,
            Metadata: this.metadata
        });
        const response = await this.s3.send(command);
        return response.UploadId;
    }

    async _uploadBuffer() {
        const uploadPartCommand = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: this.objectKey,
            PartNumber: this.partNumber,
            UploadId: this.uploadId,
            Body: this.buffer
        });

        const uploadPartResponse = await this.s3.send(uploadPartCommand);
        this.tags.push({
            ETag: uploadPartResponse.ETag,
            PartNumber: this.partNumber
        });
        this.partNumber += 1;
    }

    async _write(chunk, encoding, callback) {
        try {
            if (!this.uploadId) {
                this.uploadId = await this._initUpload();
            }

            this.buffer = Buffer.concat([this.buffer, chunk]);

            if (this.buffer.length >= this.minPartSize) {
                await this._uploadBuffer();
                this.buffer = Buffer.alloc(0);
            }

            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    async _finalize() {
        try {
            if (this.buffer.length > 0) {
                await this._uploadBuffer();
            }

            const completeMultipartUploadCommand = new CompleteMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: this.objectKey,
                MultipartUpload: {
                    Parts: this.tags.sort((a, b) => a.PartNumber - b.PartNumber)
                },
                UploadId: this.uploadId
            });

            await this.s3.send(completeMultipartUploadCommand);
            logger.info(this.tag, 'Finished upload to S3');
        } catch (error) {
            logger.error(this.tag, `Error completing S3 upload:${error}`);
            throw error;
        }
    }

    async _final(callback) {
        try {
            await this._finalize();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

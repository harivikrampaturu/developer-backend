import mongoose from 'mongoose';
import logger from 'a-logger';
import { MONGODB_URL } from '../config/config';

const connectToMongoDB = async () => {
    const sourceTag = 'connectToMongoDB';
    try {
        await mongoose.connect(MONGODB_URL);
        logger.info(sourceTag, 'Connected to mongodb database successfully!');
    } catch (error) {
        logger.error(sourceTag, `Error while connecting to mongodb database || Error: ${JSON.stringify(error?.message || error)}`);
    }
};

export default connectToMongoDB;

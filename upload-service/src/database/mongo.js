import mongoose from 'mongoose';
import logger from 'a-logger';
import { MONGO_URI } from '../config/config';


const connectToMongoDB = async () => {
    const sourceTag = 'connectToMongoDB';
    try {
        await mongoose.connect(MONGO_URI);
        logger.info(sourceTag, 'Connected to Mongo DB Successfully!');
    } catch (error) {
        logger.error(sourceTag, 'Error While Connecting to Mongo DB || Error: ', JSON.stringify(error?.message || error));
    }
};

export default connectToMongoDB;

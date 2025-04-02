import logger from 'a-logger';
import app from './app';
import { LOG_LEVEL, PORT, SERVICE_NAME } from './config/config';
import connectToMongoDB from './database/mongo';

async function main() {
    logger.setup({ level: LOG_LEVEL, serviceName: SERVICE_NAME });
    await connectToMongoDB();
}

app.listen(PORT, () => {
    logger.info('app', `Application started! | Port: ${PORT}`);
});

main();

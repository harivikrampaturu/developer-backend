import logger from 'a-logger';
import { server, PORT } from './app';
import { LOG_LEVEL, SERVICE_NAME } from './config/config';
import connectToMongoDB from './database/mongo';

async function main() {
    logger.setup({ level: LOG_LEVEL, serviceName: SERVICE_NAME });
    await connectToMongoDB();
}

server.listen(PORT, () => {
    logger.info('Server', `Server is running on port ${PORT}`);
    logger.info('WebSocket', 'WebSocket server is ready');
});

main();

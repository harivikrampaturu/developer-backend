import WebSocket from 'ws';
import logger from 'a-logger';
// import { noiseSuppressor } from './mvns';
import { noiseSuppressor } from './mvnsBuffer';

export function initializeWebSocket(server) {
    console.log(server, '<=== server ===>');
    const wss = new WebSocket.Server({ server });
    const tag = 'WebSocket';


    wss.on('connection', (ws, req) => {
        console.log('<=== came here ===>' );

        // Add connection details logging
        logger.info(tag, `New connection from ${req.socket.remoteAddress}`);

        // Add error handling for the initial connection
        ws.on('error', (error) => {
            logger.error(tag, 'WebSocket error:', error);
        });

        // Add ping/pong heartbeat to keep connection alive
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, 30000); // Send ping every 30 seconds

        let ns = null;

        // Initialize noise suppressor when client is ready
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'init') {
                    console.log(data, '<=== data ===>');
                    // Initialize noise suppressor with client parameters
                    const { mvnsFlag = 1, dgcFlag = 1, bvsFlag = 0 } = data;

                    /* ns = noiseSuppressor(
                        (processedData) => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(processedData, { binary: true });
                            }
                        },
                        {},
                        mvnsFlag,
                        dgcFlag,
                        bvsFlag,
                        null,
                        {}
                    ); */

                    // onData, logMeta, mvnsFlag, bvsFlag, fileTapPath, csConfig
                    ns = noiseSuppressor(
                        (processedData) => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(processedData, { binary: true });
                            }
                        },
                        {},
                        mvnsFlag,
                        0, // bvsFlag
                        null,
                        {}
                    );

                    ws.send(JSON.stringify({ type: 'ready' }));
                } else if (data.type === 'audio') {
                    /* const binaryData = Buffer.from(data.data, 'base64');
                    ws.send(binaryData, { binary: true }); */

                    // Decode base64 data and process incoming audio
                    if (ns) {
                        const binaryData = Buffer.from(data.data, 'base64');
                        const audioData = new Int16Array(new Uint8Array(binaryData).buffer);
                        ns.write(audioData);
                    }
                }
            } catch (error) {
                logger.error(tag, 'Error processing message:', error);
                // Send error back to client
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Error processing audio data'
                }));
            }
        });

        // Clean up on connection close
        ws.on('close', (code, reason) => {
            clearInterval(pingInterval);
            if (ns) {
                ns.close();
            }
            logger.info(tag, `Client disconnected. Code: ${code}, Reason: ${reason}`);
        });
    });

    // Add server-level error handling
    wss.on('error', (error) => {
        logger.error(tag, 'WebSocket server error:', error);
    });

    return wss;
}

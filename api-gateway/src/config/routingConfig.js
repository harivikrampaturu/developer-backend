import logger from 'a-logger';
import routingConfigCommon from './routingConfig-common.json';

const DEFAULT_PROXY_OPTIONS = {
    pathFilter: []
};

// eslint-disable-next-line no-unused-vars
export const onProxyReq = (proxyReq, req, res) => {
    req.startTime = Date.now();
    const { logMeta = {} } = req;
    logger.debug(
        'onProxyReq',
        `Details: ${JSON.stringify({
            type: 'request'
            // method: req.method,
            // url: req.url,
            // headers: req.headers,
            // body: req.body,
        })}`,
        logMeta
    );
};

// Log response details after receiving from target service
// eslint-disable-next-line no-unused-vars
export const onProxyRes = (proxyRes, req, _res) => {
    const { logMeta = {} } = req;
    // let responseBody = '';

    // proxyRes.on('data', (chunk) => {
    //     responseBody += chunk;
    // });
    // request and response could be matched by req.headers.requestid
    proxyRes.on('end', () => {
        req.endTime = Date.now();
        const duration = `${req.endTime - req.startTime}ms`;
        logger.debug(
            'onProxyRes',
            `Details: ${JSON.stringify({
                type: 'response',
                // method: req.method,
                status: proxyRes.statusCode,
                // headers: proxyRes.headers,
                // body: responseBody,
                // requestId: req.headers.requestid,
                duration
            })}`,
            logMeta
        );
    });
};

/**
 * Get routing configuration by environment
 * @param {string} env - The environment to get the routing configuration for
 * @returns {Object} The routing configuration
 */
export const getRoutingConfigByEnvironment = (env) => {
    const tag = 'getRoutingConfigByEnvironment';

    const routingConfig = routingConfigCommon;

    /**
     * @param {keyof routingConfig} service
     */
    return (service) => {
        const serviceConfig = routingConfig[service];
        if (!serviceConfig) {
            logger.error(tag, `Service level routing configurations not found || Service: ${service}`);
            return { exists: false, routingConfig: null };
        }
        if (!serviceConfig.proxyOptions) {
            serviceConfig.proxyOptions = DEFAULT_PROXY_OPTIONS;
        }
        if (!serviceConfig.proxyOptions?.pathFilter) {
            serviceConfig.proxyOptions.pathFilter = [];
        }
        // To log the request and response
        serviceConfig.proxyOptions.onProxyReq = onProxyReq;
        serviceConfig.proxyOptions.onProxyRes = onProxyRes;

        // Override the target for a specific environment if exists
        if (serviceConfig.proxyOptions[`target-${env}`]) {
            serviceConfig.proxyOptions.target = serviceConfig.proxyOptions[`target-${env}`];
        }
        serviceConfig.proxyOptions.logLevel = 'error';
        return { exists: true, routingConfig: serviceConfig };
    };
};

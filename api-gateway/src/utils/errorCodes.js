export const ERROR_CODES = {
    /**
     * When resource is not allowed to access
     */
    ERROR_UNAUTHORIZED: 'ERROR_UNAUTHORIZED',
    /**
     * When unknown error occurred at server side
     */
    ERROR_WRONG_AT_SERVER: 'ERROR_WRONG_AT_SERVER',
    /**
     * When resource not found
     */
    ERROR_NOT_FOUND: 'ERROR_NOT_FOUND',
    /**
     * When resource or service is no longer supported
     */
    ERROR_DEPRECATED_ROUTE: 'ERROR_DEPRECATED_ROUTE',
    /**
     * When proxy to respective service is failed
     */
    ERROR_PROXY_FAILED: 'ERROR_PROXY_FAILED',
    /**
     * When user reached rate limit for the time period
     */
    ERROR_RATE_LIMIT_EXCEEDED: 'ERROR_RATE_LIMIT_EXCEEDED'
};

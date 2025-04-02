/**
 * Response messages for the API
 */
export const RESPONSE_MSGS = {
    WELCOME_SUCCESS: 'Welcome',
    HEALTH_CHECK_SUCCESS: 'OK!',
    UNAUTHORIZED: 'You are not authorized to perform this action!',
    SOME_THING_WENT_WRONG: 'Something went wrong!',
    NOT_FOUND_ROUTE: "Sorry! We haven't found this route or not implemented yet!",
    INVALID_REQUEST: 'Not received valid inputs!',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    DEPRECATED_ROUTE: 'This API route is no longer supported! Please migrate to newer endpoints!',
    INVALID_SERVICE_ROUTE: 'Invalid service endpoint!',
    PROXY_FAILED: 'Failed to serve the request!',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later.',
    BLOCK_LISTED_REQUEST: 'Done!',
    SERVICES_UNAVAILABLE: 'These services are down'
};

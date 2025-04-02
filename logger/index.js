const dotenv = require('dotenv')
const rTracer = require('cls-rtracer')
const { createLogger, format, transports } = require('winston')

const { expressMiddleware } = rTracer
dotenv.config()

// ----- Config Details -----

const DEBUG_LEVEL = 'debug'
const INFO_LEVEL = 'info'
const WARN_LEVEL = 'warn'
const ERROR_LEVEL = 'error'
const LOG_LEVEL = process.env.LOG_LEVEL || DEBUG_LEVEL
const LOG_TYPE_TEXT = 'text'
const LOG_TYPE_JSON = 'json'
const LOG_TYPE =
    process.env.LOG_TYPE === LOG_TYPE_JSON ? LOG_TYPE_JSON : LOG_TYPE_TEXT

const ALLOWED_LOG_LEVELS = [DEBUG_LEVEL, INFO_LEVEL, WARN_LEVEL, ERROR_LEVEL]

const LOG_VERSION = '1.0.0'
const REQUEST_ID_HEADER_NAME = 'RequestID'

// To be initialized by the user service
let SERVICE_NAME

// ----- Helper Functions -----

/**
 * Log level validator
 * @param {string} level Log level to validate
 * @returns Whether provided log level is valid or not
 */
const isValidLogLevel = (level) => ALLOWED_LOG_LEVELS.includes(level)

/**
 * Returns the default log level
 * @returns Default log level
 */
const getDefaultLogLevel = () => {
  if (LOG_LEVEL && isValidLogLevel(LOG_LEVEL)) {
    return LOG_LEVEL
  }
  return DEBUG_LEVEL
}

/**
 * Get service name using env variables
 * @returns string Service Name
 */
const getServiceName = () => SERVICE_NAME || ''

/**
 * Utility function to get request id
 * @returns Request ID
 */
const getRequestID = () => String(rTracer.id() || '')

/**
 * Utility for formatting log meta data
 * @param {Object} metaData
 * @returns Formatted log meta data
 */
const formatAndConstructLogMetaData = (metaData) => {
  let {
    requestID = getRequestID(),
    requestFrom = '',
    serviceName = getServiceName(),
    userId = '',
    userID = '',
    teamId = '',
    method = '',
    urlPath = ''
  } = metaData

  // Convert the meta details into string always
  if (typeof requestID !== 'string') {
    requestID = String(requestID)
  }

  if (typeof requestFrom !== 'string') {
    requestFrom = String(requestFrom)
  }

  if (typeof serviceName !== 'string') {
    serviceName = String(serviceName)
  }

  if (typeof userID !== 'string') {
    userID = String(userID)
  }

  const logVersion = LOG_VERSION

  const meta = {
    logVersion,
    requestID,
    requestFrom,
    serviceName,
    userId,
    userID,
    teamId,
    method,
    urlPath
  }
  return meta
}

/**
 * Utility for sanitizing log parameters
 * @param {string} level Log Level
 * @param {string} tag Source tag
 * @param {string} message Log Message
 * @param {Object} metaData Metadata fields
 * @returns Sanitized and formatted log parameters
 */
const sanitizeLogParameters = (level, tag, message, metaData) => {
  // if the log level is invalid, set it to "warn"
  const logLevel = isValidLogLevel(level) ? level : WARN_LEVEL
  const logTag = tag
  const logMessage = message
  const meta = formatAndConstructLogMetaData(metaData)
  return {
    logLevel,
    logMessage,
    logTag,
    meta
  }
}

/**
 * Get IP Address from request
 * @param {import('express').Request} request
 * @returns {string} IP Address
 */
const getIPAddress = (request) => {
  const originalIps = String(
    request.headers['x-original-forwarded-for'] || ''
  ).split(',')
  if (originalIps.length && originalIps[originalIps.length - 1]) {
    return originalIps[originalIps.length - 1].trim()
  }

  const ips = String(request.headers['x-forwarded-for'] || '').split(',')
  if (ips.length && ips[0]) {
    return ips[0].trim()
  }

  return ''
}

// ----- Middlewares -----

/**
 * Utility for getting default log meta from request
 * @param {Request} req Request
 * @returns Default log meta
 */
const getLogMetaFromRequest = (req) => {
  const meta = {}
  const ip = getIPAddress(req)
  if (req.header('UserID')) meta.userID = req.header('UserID')
  else if (req.header('UUID')) meta.userID = req.header('UUID')
  if (req.header('RequestFrom')) meta.requestFrom = req.header('RequestFrom')
  meta.method = req.method
  meta.apiPath = req.originalUrl
  meta.urlPath = req.originalUrl
  meta.ip = ip
  return meta
}

/**
 * Utility for setting default options
 * @param {Object} options Options
 * @returns Options
 */
const setDefaultOptions = (options = {}) => {
  // Options extract
  if (!options.headerName) {
    options.headerName = REQUEST_ID_HEADER_NAME
  }
  return options
}

/**
 * Middleware for Tracer
 * @param {Object} options Options
 * @returns
 */
const initTracerMiddleware = (options = {}) => {
  const tracer = expressMiddleware({
    useHeader: true,
    headerName: options.headerName
  })
  return tracer
}

/**
 * Logmeta middleware
 * @returns Logmeta middleware
 */
const initLogMetaMiddleware = () => {
  // Return middleware
  return (req, res, next) => {
    // Log the end request
    req.logMeta = getLogMetaFromRequest(req)
    next()
  }
}

/**
 * This function will initialize the middlewares required for logger
 * @param {Object} options Options
 * @returns List of middlewares
 */
const initializeMiddlewares = (options = {}) => {
  // Set default options
  options = setDefaultOptions(options)
  // Return middleware
  return [
    // Init the tracer
    initTracerMiddleware(options),
    // Init the request log meta data
    initLogMetaMiddleware()
  ]
}

// ----- Logger Class -----

const LoggerTextFormat = format.combine(
  format.timestamp(),
  format.simple(),
  format.printf(
    ({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`
  )
)

const LoggerJsonFormat = format.combine(format.timestamp(), format.json())

class Logger {
  constructor () {
    this.logger = createLogger({
      exitOnError: false,
      format:
                LOG_TYPE === LOG_TYPE_TEXT
                  ? LoggerTextFormat
                  : LoggerJsonFormat,
      level: getDefaultLogLevel(),
      transports: [
        new transports.Console({
          handleExceptions: true,
          stderrLevels: [ERROR_LEVEL],
          consoleWarnLevels: [ERROR_LEVEL]
        })
      ]
    })
  }

  sanitizeParametersAndLog = (level, tag, message, meta = {}) => {
    const {
      logLevel,
      logTag,
      logMessage,
      meta: metaData
    } = sanitizeLogParameters(level, tag, message, meta)
    if (LOG_TYPE === LOG_TYPE_TEXT) {
      this.logger[logLevel](`${logTag} :: ${logMessage}`)
    } else {
      this.logger[logLevel](logMessage, {
        sourceTag: logTag,
        ...metaData
      })
    }
  }

  checkAndUpdateLogLevel = (toLevel) => {
    // indicate if the log level is invalid
    if (!isValidLogLevel(toLevel)) {
      return false
    }

    this.logger.level = toLevel

    // indicate that the level update was successful
    return true
  }
}

// export a Logger instance
const LoggerUtil = new Logger()

/**
 * @typedef {{level?: 'debug' | 'info' | 'warn' | 'error', serviceName?: string}} loggerConfig
 */

const logger = {
  getRequestID,
  log: (level, tag, message, meta) =>
    LoggerUtil.sanitizeParametersAndLog(level, tag, message, meta),
  debug: (tag, message, meta) =>
    LoggerUtil.sanitizeParametersAndLog(DEBUG_LEVEL, tag, message, meta),
  info: (tag, message, meta) =>
    LoggerUtil.sanitizeParametersAndLog(INFO_LEVEL, tag, message, meta),
  error: (tag, message, meta) =>
    LoggerUtil.sanitizeParametersAndLog(ERROR_LEVEL, tag, message, meta),
  warn: (tag, message, meta) =>
    LoggerUtil.sanitizeParametersAndLog(WARN_LEVEL, tag, message, meta),
  setLogLevel: (level) => LoggerUtil.checkAndUpdateLogLevel(level),
  initializeMiddlewares,
  /**
     * @param {loggerConfig} conf
     */
  setup: (conf) => {
    if (conf.level) LoggerUtil.checkAndUpdateLogLevel(conf.level)
    if (conf.serviceName) SERVICE_NAME = conf.serviceName
  }
}

// export default logger

module.exports = {
  __esModule: true,
  logger,
  default: logger
}

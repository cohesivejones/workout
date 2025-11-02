import winston from 'winston';

// Determine log level based on environment
const getLogLevel = (): string => {
  if (process.env.NODE_ENV === 'test') {
    return 'debug'; // Show info logs in tests to verify logging works
  }
  if (process.env.NODE_ENV === 'production') {
    return 'info';
  }
  return 'debug'; // Verbose in development
};

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'workout-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service !== 'workout-api') {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      ),
    }),
  ],
});

export default logger;

// src/logger.js

const winston = require('winston');

// Création logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Console colorée en dev
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Middleware Express pour tracer chaque requête
const logMiddleware = (req, res, next) => {
  const start = Date.now();
  const sessionId = req.headers['x-session-id'] || 'anonymous';

  logger.info('→ Requête', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip?.replace(/\.\d+$/, '.xxx'),
    sessionId,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('← Réponse', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      sessionId
    });
  });

  next();
};

module.exports = { logger, logMiddleware };

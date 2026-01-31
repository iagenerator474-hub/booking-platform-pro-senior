const crypto = require('crypto');
const { makeLogger } = require('../lib/logger');

function makeRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || makeRequestId();
  req.requestId = requestId;

  // Per-request logger
  req.log = makeLogger({ requestId, module: 'http' });

  // Expose for clients / debugging
  res.setHeader('x-request-id', requestId);

  const start = Date.now();

  req.log.info({
    action: 'http.request.received',
    message: `${req.method} ${req.originalUrl}`,
    method: req.method,
    path: req.originalUrl,
  });

  res.on('finish', () => {
    req.log.info({
      action: 'http.request.completed',
      message: `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}

module.exports = { requestContext };

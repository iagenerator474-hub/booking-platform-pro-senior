function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  const log = (req && req.log) || null;
  if (log && typeof log.error === 'function') {
    log.error({
      module: 'http',
      action: 'http.request.failed',
      message: err.message || 'Unhandled error',
      statusCode,
      error: err,
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Never leak stack traces to the client
  const isServerError = statusCode >= 500;
  res.status(statusCode).json({
    error: isServerError ? 'internal_error' : 'request_error',
    message: isServerError ? 'Something went wrong' : err.message,
    requestId: req && req.requestId,
  });
}

module.exports = { errorHandler };

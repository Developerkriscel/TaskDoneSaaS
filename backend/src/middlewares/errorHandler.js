export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Never expose stack traces in production
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    details: isDev ? (err.details || null) : null,
    stack: isDev ? err.stack : undefined
  });
}

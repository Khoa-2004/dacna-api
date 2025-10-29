// Global error handling middleware for Express
// Placed at the end of the server.js file: app.use(errorHandler)
export function errorHandler(err, req, res, next) {
  console.error("Error:", err.message || err);

  // If the error already has an HTTP code
  if (res.headersSent) return next(err);

  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    ok: false,
    error: message,
  });
}

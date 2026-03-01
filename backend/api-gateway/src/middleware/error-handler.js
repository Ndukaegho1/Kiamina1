export const errorHandlerMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error(`[${req.id}]`, error);

  return res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    requestId: req.id
  });
};

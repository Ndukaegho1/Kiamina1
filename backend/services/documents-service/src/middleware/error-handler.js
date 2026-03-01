export const errorHandlerMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.name === "MulterError") {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large." : error.message
    });
  }

  console.error(error);
  return res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
};

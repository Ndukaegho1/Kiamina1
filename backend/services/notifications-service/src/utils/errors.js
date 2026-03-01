export const createServiceUnavailableError = (message) => {
  const error = new Error(message);
  error.status = 503;
  return error;
};

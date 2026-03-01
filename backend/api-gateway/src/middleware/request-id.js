import { randomUUID } from "node:crypto";

export const requestIdMiddleware = (req, res, next) => {
  const existingRequestId = req.headers["x-request-id"];
  const requestId =
    typeof existingRequestId === "string" && existingRequestId.trim()
      ? existingRequestId.trim()
      : randomUUID();

  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

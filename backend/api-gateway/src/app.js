import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import v1Router from "./routes/v1/index.js";

const app = express();
const helmetOptions = {
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
};

morgan.token("id", (req) => req.id || "-");

const isAllowedOrigin = (origin = "") => {
  if (!origin) return true;
  if (env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
    return true;
  }

  // Keep production strict. In local development, allow dynamic ports/LAN origins.
  if (env.nodeEnv === "development") return true;
  return false;
};

app.use(requestIdMiddleware);
app.use(helmet(helmetOptions));
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      const corsError = new Error("Origin not allowed by CORS policy");
      corsError.status = 403;
      return callback(corsError);
    }
  })
);
app.use(rateLimitMiddleware);
app.use(morgan(":date[iso] :id :method :url :status :response-time ms"));

app.get("/health", (req, res) => {
  res.json({
    service: env.serviceName,
    status: "ok",
    env: env.nodeEnv
  });
});

app.use("/api/v1", v1Router);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;

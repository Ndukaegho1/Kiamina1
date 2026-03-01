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

morgan.token("id", (req) => req.id || "-");

app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS policy"));
    }
  })
);
app.use(express.json({ limit: "1mb" }));
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

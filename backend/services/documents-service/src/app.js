import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import documentsRoutes from "./routes/v1/documents.routes.js";

const app = express();
const helmetOptions = {
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
};

const isAllowedOrigin = (origin = "") => {
  if (!origin) return true;
  if (env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
    return true;
  }
  if (env.nodeEnv === "development") return true;
  return false;
};

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
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({
    service: env.serviceName,
    status: "ok",
    env: env.nodeEnv
  });
});

app.use("/api/v1/documents", documentsRoutes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;

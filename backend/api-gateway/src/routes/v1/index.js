import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "../../config/env.js";

const router = express.Router();

const createDomainProxy = (targetUrl, routePrefix, servicePrefix) =>
  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => `${servicePrefix}${path}`,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.id) {
          proxyReq.setHeader("x-request-id", req.id);
        }
      }
    }
  });

router.get("/gateway/info", (req, res) => {
  res.json({
    service: env.serviceName,
    version: "v1",
    dependencies: {
      authServiceUrl: env.authServiceUrl,
      usersServiceUrl: env.usersServiceUrl,
      documentsServiceUrl: env.documentsServiceUrl,
      notificationsServiceUrl: env.notificationsServiceUrl
    }
  });
});

router.use("/auth", createDomainProxy(env.authServiceUrl, "auth", "/api/v1/auth"));
router.use("/users", createDomainProxy(env.usersServiceUrl, "users", "/api/v1/users"));
router.use(
  "/documents",
  createDomainProxy(env.documentsServiceUrl, "documents", "/api/v1/documents")
);
router.use(
  "/notifications",
  createDomainProxy(
    env.notificationsServiceUrl,
    "notifications",
    "/api/v1/notifications"
  )
);

export default router;

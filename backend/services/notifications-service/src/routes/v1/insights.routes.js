import express from "express";
import {
  createInsightArticle,
  deleteInsightArticle,
  getInsightArticleById,
  listInsightArticles,
  patchInsightArticle,
  searchInsightArticles
} from "../../controllers/insights.controller.js";
import {
  createInsightAnalyticsEvent,
  getInsightAnalyticsSummary
} from "../../controllers/insights-analytics.controller.js";

const router = express.Router();

router.post("/analytics/events", createInsightAnalyticsEvent);
router.get("/analytics/summary", getInsightAnalyticsSummary);
router.post("/articles", createInsightArticle);
router.get("/articles", listInsightArticles);
router.get("/articles/search", searchInsightArticles);
router.get("/articles/:articleId", getInsightArticleById);
router.patch("/articles/:articleId", patchInsightArticle);
router.delete("/articles/:articleId", deleteInsightArticle);

export default router;

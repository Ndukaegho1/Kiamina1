import express from "express";
import {
  createArticle,
  deleteArticle,
  getArticleById,
  listArticles,
  patchArticle,
  searchArticles
} from "../../controllers/knowledge-base.controller.js";

const router = express.Router();

router.post("/articles", createArticle);
router.get("/articles", listArticles);
router.get("/articles/search", searchArticles);
router.get("/articles/:articleId", getArticleById);
router.patch("/articles/:articleId", patchArticle);
router.delete("/articles/:articleId", deleteArticle);

export default router;

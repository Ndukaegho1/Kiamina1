import { InsightArticle } from "../models/InsightArticle.model.js";

export const createInsightArticle = async (payload) =>
  InsightArticle.create(payload);

export const findInsightArticleByArticleId = async (articleId) =>
  InsightArticle.findOne({ articleId });

export const listInsightArticles = async ({
  status = "",
  category = "",
  visibility = "",
  limit = 50
} = {}) => {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (visibility) query.visibility = visibility;

  return InsightArticle.find(query).sort({ updatedAt: -1 }).limit(limit);
};

export const updateInsightArticleByArticleId = async (articleId, payload) =>
  InsightArticle.findOneAndUpdate(
    { articleId },
    { $set: payload },
    {
      new: true,
      runValidators: true
    }
  );

export const deleteInsightArticleByArticleId = async (articleId) =>
  InsightArticle.findOneAndDelete({ articleId });

export const searchInsightArticles = async ({
  query = "",
  visibility = "",
  status = "published",
  limit = 10
} = {}) => {
  const trimmed = String(query || "").trim();
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const filter = {};
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;

  if (!trimmed) {
    return InsightArticle.find(filter).sort({ updatedAt: -1 }).limit(normalizedLimit);
  }

  return InsightArticle.find({
    ...filter,
    $or: [
      { title: { $regex: trimmed, $options: "i" } },
      { excerpt: { $regex: trimmed, $options: "i" } },
      { content: { $regex: trimmed, $options: "i" } },
      { author: { $regex: trimmed, $options: "i" } },
      { tags: { $elemMatch: { $regex: trimmed, $options: "i" } } }
    ]
  })
    .sort({ updatedAt: -1 })
    .limit(normalizedLimit);
};

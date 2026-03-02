import { KnowledgeBaseArticle } from "../models/KnowledgeBaseArticle.model.js";

export const createKnowledgeBaseArticle = async (payload) =>
  KnowledgeBaseArticle.create(payload);

export const findKnowledgeBaseArticleByArticleId = async (articleId) =>
  KnowledgeBaseArticle.findOne({ articleId });

export const listKnowledgeBaseArticles = async ({
  status = "",
  category = "",
  visibility = "",
  limit = 50
} = {}) => {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (visibility) query.visibility = visibility;

  return KnowledgeBaseArticle.find(query).sort({ updatedAt: -1 }).limit(limit);
};

export const updateKnowledgeBaseArticleByArticleId = async (articleId, payload) =>
  KnowledgeBaseArticle.findOneAndUpdate(
    { articleId },
    { $set: payload },
    {
      new: true,
      runValidators: true
    }
  );

export const deleteKnowledgeBaseArticleByArticleId = async (articleId) =>
  KnowledgeBaseArticle.findOneAndDelete({ articleId });

export const searchKnowledgeBaseArticles = async ({
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
    return KnowledgeBaseArticle.find(filter).sort({ updatedAt: -1 }).limit(normalizedLimit);
  }

  return KnowledgeBaseArticle.find({
    ...filter,
    $or: [
      { title: { $regex: trimmed, $options: "i" } },
      { summary: { $regex: trimmed, $options: "i" } },
      { content: { $regex: trimmed, $options: "i" } },
      { tags: { $elemMatch: { $regex: trimmed, $options: "i" } } }
    ]
  })
    .sort({ updatedAt: -1 })
    .limit(normalizedLimit);
};

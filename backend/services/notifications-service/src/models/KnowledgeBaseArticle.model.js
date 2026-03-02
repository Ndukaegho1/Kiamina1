import mongoose from "mongoose";

const CATEGORIES = ["faq", "billing", "technical", "security", "getting-started", "other"];
const STATUSES = ["draft", "published", "archived"];
const VISIBILITIES = ["public", "internal"];

const knowledgeBaseArticleSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    summary: {
      type: String,
      default: "",
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: "faq",
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "draft",
      index: true
    },
    visibility: {
      type: String,
      enum: VISIBILITIES,
      default: "public",
      index: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    createdByUid: {
      type: String,
      default: ""
    },
    updatedByUid: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

knowledgeBaseArticleSchema.index({ status: 1, category: 1, updatedAt: -1 });
knowledgeBaseArticleSchema.index({ title: "text", summary: "text", content: "text", tags: "text" });

export const KnowledgeBaseArticle = mongoose.model(
  "KnowledgeBaseArticle",
  knowledgeBaseArticleSchema
);

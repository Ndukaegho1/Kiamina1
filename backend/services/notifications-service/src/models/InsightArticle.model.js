import mongoose from "mongoose";

const CATEGORIES = [
  "payroll-governance",
  "sme-accounting-controls",
  "nonprofit-reporting",
  "tax-compliance",
  "financial-strategy",
  "cloud-accounting",
  "regulatory-updates",
  "cross-border-advisory",
  "other"
];
const STATUSES = ["draft", "published", "archived"];
const VISIBILITIES = ["public", "internal"];

const insightArticleSchema = new mongoose.Schema(
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
    excerpt: {
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
      default: "financial-strategy",
      index: true
    },
    author: {
      type: String,
      default: "Kiamina Advisory Team",
      trim: true
    },
    readTimeMinutes: {
      type: Number,
      default: 6,
      min: 1,
      max: 60
    },
    coverImageUrl: {
      type: String,
      default: ""
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

insightArticleSchema.index({ status: 1, category: 1, updatedAt: -1 });
insightArticleSchema.index({ title: "text", excerpt: "text", content: "text", author: "text", tags: "text" });

export const InsightArticle = mongoose.model(
  "InsightArticle",
  insightArticleSchema
);

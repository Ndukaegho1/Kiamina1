import mongoose from "mongoose";

const accountingRecordSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["expenses", "sales", "bank-statements", "other"],
      required: true,
      index: true
    },
    className: {
      type: String,
      default: ""
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "NGN"
    },
    transactionType: {
      type: String,
      enum: ["debit", "credit", "unknown"],
      default: "unknown"
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      default: ""
    },
    vendorName: {
      type: String,
      default: ""
    },
    customerName: {
      type: String,
      default: ""
    },
    paymentMethod: {
      type: String,
      default: ""
    },
    invoiceNumber: {
      type: String,
      default: ""
    },
    reference: {
      type: String,
      default: ""
    },
    sourceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null
    },
    status: {
      type: String,
      enum: ["draft", "posted", "archived"],
      default: "draft",
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: String,
      default: ""
    },
    updatedBy: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

accountingRecordSchema.index({ ownerUserId: 1, transactionDate: -1 });
accountingRecordSchema.index({ ownerUserId: 1, category: 1, status: 1 });

export const AccountingRecord = mongoose.model(
  "AccountingRecord",
  accountingRecordSchema
);

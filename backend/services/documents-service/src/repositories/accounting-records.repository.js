import { AccountingRecord } from "../models/AccountingRecord.model.js";

const escapeRegex = (value = "") =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (searchTerm) => {
  const normalized = String(searchTerm || "").trim();
  if (!normalized) {
    return null;
  }

  const regex = new RegExp(escapeRegex(normalized), "i");
  return {
    $or: [
      { description: regex },
      { vendorName: regex },
      { customerName: regex },
      { invoiceNumber: regex },
      { reference: regex },
      { className: regex }
    ]
  };
};

export const createAccountingRecord = async (payload) =>
  AccountingRecord.create(payload);

export const findAccountingRecordById = async (id) => AccountingRecord.findById(id);

export const updateAccountingRecordById = async (id, payload) =>
  AccountingRecord.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

export const deleteAccountingRecordById = async (id) =>
  AccountingRecord.findByIdAndDelete(id);

export const listAccountingRecords = async ({
  ownerUserId,
  category,
  status,
  className,
  dateFrom,
  dateTo,
  search,
  limit = 50,
  skip = 0
}) => {
  const query = {};

  if (ownerUserId) {
    query.ownerUserId = ownerUserId;
  }
  if (category) {
    query.category = category;
  }
  if (status) {
    query.status = status;
  }
  if (className) {
    query.className = className;
  }

  if (dateFrom || dateTo) {
    query.transactionDate = {};
    if (dateFrom) {
      query.transactionDate.$gte = dateFrom;
    }
    if (dateTo) {
      query.transactionDate.$lte = dateTo;
    }
  }

  const searchFilter = buildSearchFilter(search);
  if (searchFilter) {
    Object.assign(query, searchFilter);
  }

  const [items, total] = await Promise.all([
    AccountingRecord.find(query)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(Math.max(0, skip))
      .limit(Math.max(1, limit)),
    AccountingRecord.countDocuments(query)
  ]);

  return {
    items,
    total
  };
};

export const summarizeAccountingRecords = async ({
  ownerUserId,
  category,
  status,
  dateFrom,
  dateTo
}) => {
  const match = {};

  if (ownerUserId) {
    match.ownerUserId = ownerUserId;
  }
  if (category) {
    match.category = category;
  }
  if (status) {
    match.status = status;
  }
  if (dateFrom || dateTo) {
    match.transactionDate = {};
    if (dateFrom) {
      match.transactionDate.$gte = dateFrom;
    }
    if (dateTo) {
      match.transactionDate.$lte = dateTo;
    }
  }

  const [overall] = await AccountingRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }
    }
  ]);

  const byCategory = await AccountingRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        amount: { $sum: "$amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    totalCount: overall?.totalCount || 0,
    totalAmount: overall?.totalAmount || 0,
    byCategory: byCategory.map((item) => ({
      category: item._id,
      count: item.count,
      amount: item.amount
    }))
  };
};

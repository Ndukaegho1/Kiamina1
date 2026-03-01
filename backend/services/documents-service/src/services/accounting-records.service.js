import {
  createAccountingRecord,
  deleteAccountingRecordById,
  findAccountingRecordById,
  listAccountingRecords,
  summarizeAccountingRecords,
  updateAccountingRecordById
} from "../repositories/accounting-records.repository.js";

export const createRecord = async (payload) => createAccountingRecord(payload);

export const getRecordById = async (id) => findAccountingRecordById(id);

export const updateRecordById = async ({ id, payload }) =>
  updateAccountingRecordById(id, payload);

export const removeRecordById = async (id) => deleteAccountingRecordById(id);

export const getRecords = async (filters) => listAccountingRecords(filters);

export const getRecordsSummary = async (filters) =>
  summarizeAccountingRecords(filters);

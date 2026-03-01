import { apiFetch } from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const parseErrorResponse = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const parseJsonResponse = async (response) => {
  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
  return response.json();
};

export const listAccountingRecords = async (params = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch(`/api/documents/records${query}`);
  return parseJsonResponse(response);
};

export const createAccountingRecord = async (payload = {}) => {
  const response = await apiFetch("/api/documents/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
};

export const updateAccountingRecord = async (id, payload = {}) => {
  const response = await apiFetch(`/api/documents/records/${encodeURIComponent(String(id || ""))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
};

export const deleteAccountingRecord = async (id) => {
  const response = await apiFetch(`/api/documents/records/${encodeURIComponent(String(id || ""))}`, {
    method: "DELETE",
  });
  return parseJsonResponse(response);
};

export const importAccountingRecords = async ({
  file,
  ownerUserId = "",
  category = "",
  status = "draft",
  transactionType = "unknown",
  currency = "NGN",
  dryRun = false,
} = {}) => {
  if (!(file instanceof File)) {
    throw new Error("A CSV or XLSX file is required.");
  }

  const formData = new FormData();
  formData.set("file", file);
  if (ownerUserId) formData.set("ownerUserId", ownerUserId);
  if (category) formData.set("category", category);
  if (status) formData.set("status", status);
  if (transactionType) formData.set("transactionType", transactionType);
  if (currency) formData.set("currency", currency);
  formData.set("dryRun", dryRun ? "true" : "false");

  const response = await apiFetch("/api/documents/records/import", {
    method: "POST",
    body: formData,
  });
  return parseJsonResponse(response);
};

export const getMonthlyProfitLossReport = async (params = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch(`/api/documents/records/reports/profit-loss${query}`);
  return parseJsonResponse(response);
};

export const getMonthlyCashflowReport = async (params = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch(`/api/documents/records/reports/cashflow${query}`);
  return parseJsonResponse(response);
};

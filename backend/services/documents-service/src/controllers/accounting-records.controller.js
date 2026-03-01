import {
  createRecord,
  getRecordById,
  getRecords,
  getRecordsSummary,
  removeRecordById,
  updateRecordById
} from "../services/accounting-records.service.js";
import { getRequestActor, isPrivilegedActor } from "../utils/request-actor.js";
import {
  buildRecordUpdatePayload,
  validateCreateRecordPayload,
  validateListRecordQuery,
  validateSummaryQuery
} from "../validation/accounting-records.validation.js";

const requireActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  return actor;
};

export const createOne = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const { errors, payload } = validateCreateRecordPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (!isPrivilegedActor(actor) && payload.ownerUserId !== actor.uid) {
      return res.status(403).json({
        message: "You can only create records for your own account."
      });
    }

    const record = await createRecord({
      ...payload,
      createdBy: actor.uid,
      updatedBy: actor.uid
    });

    return res.status(201).json(record);
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const { errors, payload } = validateListRecordQuery(req.query, actor);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (
      !isPrivilegedActor(actor) &&
      payload.ownerUserId &&
      payload.ownerUserId !== actor.uid
    ) {
      return res
        .status(403)
        .json({ message: "You can only view your own records." });
    }

    const records = await getRecords(payload);
    return res.status(200).json(records);
  } catch (error) {
    return next(error);
  }
};

export const summary = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const { errors, payload } = validateSummaryQuery(req.query, actor);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (
      !isPrivilegedActor(actor) &&
      payload.ownerUserId &&
      payload.ownerUserId !== actor.uid
    ) {
      return res
        .status(403)
        .json({ message: "You can only view your own record summary." });
    }

    const aggregated = await getRecordsSummary(payload);
    return res.status(200).json(aggregated);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const record = await getRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (!isPrivilegedActor(actor) && record.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot access this record." });
    }

    return res.status(200).json(record);
  } catch (error) {
    return next(error);
  }
};

export const putById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const existing = await getRecordById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Record not found" });
    }

    const actorIsPrivileged = isPrivilegedActor(actor);
    if (!actorIsPrivileged && existing.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot update this record." });
    }

    const { payload, errors } = buildRecordUpdatePayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "Provide at least one field to update." });
    }

    if (!actorIsPrivileged && payload.ownerUserId && payload.ownerUserId !== actor.uid) {
      return res.status(403).json({
        message: "Only privileged users can transfer record ownership."
      });
    }

    const updated = await updateRecordById({
      id: req.params.id,
      payload: {
        ...payload,
        updatedBy: actor.uid
      }
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const removeById = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) {
      return;
    }

    const existing = await getRecordById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (!isPrivilegedActor(actor) && existing.ownerUserId !== actor.uid) {
      return res.status(403).json({ message: "You cannot delete this record." });
    }

    const deleted = await removeRecordById(req.params.id);
    return res.status(200).json({
      message: "Record deleted successfully.",
      id: deleted.id
    });
  } catch (error) {
    return next(error);
  }
};

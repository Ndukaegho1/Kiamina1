import { WebsiteInsightEvent } from "../models/WebsiteInsightEvent.model.js";

export const createWebsiteInsightEvent = async (payload) =>
  WebsiteInsightEvent.create(payload);

const toDateKey = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getDateRangeKeys = (days = 30) => {
  const totalDays = Math.max(1, Math.min(Number(days) || 30, 365));
  const keys = [];
  const now = new Date();
  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const cursor = new Date(now);
    cursor.setDate(now.getDate() - index);
    keys.push(toDateKey(cursor));
  }
  return keys;
};

export const getWebsiteInsightAnalyticsSummary = async ({
  days = 30,
  topLimit = 8
} = {}) => {
  const normalizedDays = Math.max(1, Math.min(Number(days) || 30, 365));
  const normalizedTopLimit = Math.max(1, Math.min(Number(topLimit) || 8, 25));
  const rangeStartDate = new Date(Date.now() - (normalizedDays * 24 * 60 * 60 * 1000));
  const baseMatch = {
    createdAt: { $gte: rangeStartDate }
  };

  const [
    visitorRows,
    interactionCount,
    totalEvents,
    topInteractions,
    topServices,
    pageRows,
    timelineRows
  ] = await Promise.all([
    WebsiteInsightEvent.aggregate([
      { $match: { ...baseMatch, category: "visit" } },
      { $group: { _id: "$sessionId" } },
      { $count: "count" }
    ]),
    WebsiteInsightEvent.countDocuments({ ...baseMatch, category: "interaction" }),
    WebsiteInsightEvent.countDocuments(baseMatch),
    WebsiteInsightEvent.aggregate([
      { $match: { ...baseMatch, category: "interaction" } },
      {
        $project: {
          targetType: { $ifNull: ["$targetType", ""] },
          interactionKey: {
            $cond: [
              { $ne: ["$targetLabel", ""] },
              "$targetLabel",
              {
                $cond: [
                  { $ne: ["$targetId", ""] },
                  "$targetId",
                  "$eventType"
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            interactionKey: "$interactionKey",
            targetType: "$targetType"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: normalizedTopLimit }
    ]),
    WebsiteInsightEvent.aggregate([
      { $match: { ...baseMatch, category: "interaction", targetType: "service" } },
      {
        $project: {
          serviceName: {
            $cond: [
              { $ne: ["$targetLabel", ""] },
              "$targetLabel",
              {
                $cond: [
                  { $ne: ["$targetId", ""] },
                  "$targetId",
                  "$eventType"
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$serviceName",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: normalizedTopLimit }
    ]),
    WebsiteInsightEvent.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            page: "$page",
            category: "$category"
          },
          count: { $sum: 1 }
        }
      }
    ]),
    WebsiteInsightEvent.aggregate([
      { $match: baseMatch },
      {
        $project: {
          category: 1,
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            day: "$day",
            category: "$category"
          },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const uniqueVisitors = Number(visitorRows?.[0]?.count || 0);

  const topInteractionTargets = topInteractions.map((row) => ({
    key: row?._id?.interactionKey || "Unknown",
    targetType: row?._id?.targetType || "other",
    count: Number(row?.count || 0)
  }));

  const topServiceInteractions = topServices.map((row) => ({
    service: row?._id || "Unknown Service",
    count: Number(row?.count || 0)
  }));

  const pageBreakdownMap = new Map();
  pageRows.forEach((row) => {
    const pageKey = String(row?._id?.page || "unknown").trim() || "unknown";
    const category = String(row?._id?.category || "").trim();
    const count = Number(row?.count || 0);
    if (!pageBreakdownMap.has(pageKey)) {
      pageBreakdownMap.set(pageKey, {
        page: pageKey,
        visits: 0,
        interactions: 0
      });
    }
    const entry = pageBreakdownMap.get(pageKey);
    if (category === "visit") entry.visits += count;
    if (category === "interaction") entry.interactions += count;
  });

  const pageBreakdown = [...pageBreakdownMap.values()]
    .sort((left, right) => (right.visits + right.interactions) - (left.visits + left.interactions))
    .slice(0, normalizedTopLimit);

  const timelineIndex = new Map();
  timelineRows.forEach((row) => {
    const day = String(row?._id?.day || "").trim();
    if (!day) return;
    if (!timelineIndex.has(day)) {
      timelineIndex.set(day, { date: day, visits: 0, interactions: 0 });
    }
    const entry = timelineIndex.get(day);
    const category = String(row?._id?.category || "").trim();
    const count = Number(row?.count || 0);
    if (category === "visit") entry.visits += count;
    if (category === "interaction") entry.interactions += count;
  });

  const timeline = getDateRangeKeys(normalizedDays).map((dateKey) => (
    timelineIndex.get(dateKey) || { date: dateKey, visits: 0, interactions: 0 }
  ));

  return {
    periodDays: normalizedDays,
    totals: {
      uniqueVisitors,
      interactions: Number(interactionCount || 0),
      totalEvents: Number(totalEvents || 0)
    },
    topInteractionTargets,
    topServiceInteractions,
    pageBreakdown,
    timeline
  };
};

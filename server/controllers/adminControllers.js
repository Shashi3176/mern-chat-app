const asyncHandler = require("express-async-handler");
const ToxicityLog = require("../models/toxicityLogModel");

//@description     Get toxicity logs (admin only)
//@route           GET /api/admin/toxicity-logs
//@access          Admin
const getToxicityLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    userId,
    category,
  } = req.query;

  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  if (category) {
    filter.detectedCategories = category;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    ToxicityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    ToxicityLog.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    logs,
    total,
    page: parseInt(page),
    totalPages,
  });
});

//@description     Get toxicity statistics (admin only)
//@route           GET /api/admin/toxicity-stats
//@access          Admin
const getToxicityStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [blockedToday, blockedWeek, blockedMonth, totalBlocked, categoryStats] = await Promise.all([
    ToxicityLog.countDocuments({ createdAt: { $gte: startOfDay } }),
    ToxicityLog.countDocuments({ createdAt: { $gte: startOfWeek } }),
    ToxicityLog.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ToxicityLog.countDocuments(),
    ToxicityLog.aggregate([
      { $unwind: "$detectedCategories" },
      { $group: { _id: "$detectedCategories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const topUsers = await ToxicityLog.aggregate([
    { $group: { _id: { userId: "$userId", name: "$userAnonymousName" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { userId: "$_id.userId", name: "$_id.name", count: 1, _id: 0 } },
  ]);

  const commonCategories = categoryStats.map(c => ({
    category: c._id,
    count: c.count,
  }));

  res.json({
    blockedToday,
    blockedWeek,
    blockedMonth,
    totalBlocked,
    mostCommonCategories: commonCategories,
    topUsersByBlocks: topUsers,
  });
});

const getToxicityCharts = asyncHandler(async (req, res) => {
  const now = new Date();
  const last7 = new Date(now);
  last7.setDate(now.getDate() - 6);
  last7.setHours(0, 0, 0, 0);

  const [dailyCounts, categoryCounts, topUsers] = await Promise.all([
    ToxicityLog.aggregate([
      { $match: { createdAt: { $gte: last7 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ToxicityLog.aggregate([
      { $unwind: "$detectedCategories" },
      { $group: { _id: "$detectedCategories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ToxicityLog.aggregate([
      {
        $group: {
          _id: { userId: "$userId", name: "$userAnonymousName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          userId: "$_id.userId",
          name: "$_id.name",
          count: 1,
          _id: 0,
        },
      },
    ]),
  ]);

  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dates.push(key);
  }

  const dailyMap = Object.fromEntries(dailyCounts.map((item) => [item._id, item.count]));
  const blockedOverTime = dates.map((date) => ({
    date,
    count: dailyMap[date] ?? 0,
  }));

  res.json({
    blockedOverTime,
    categoryDistribution: categoryCounts.map((item) => ({
      category: item._id,
      count: item.count,
    })),
    topUsersByBlocks: topUsers,
  });
});

module.exports = { getToxicityLogs, getToxicityStats, getToxicityCharts };
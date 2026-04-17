const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const protect = require('../middleware/auth');

// GET /api/analytics/summary?month=4&year=2024
router.get('/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const monthTx = await Transaction.find({ userId: req.user._id, date: { $gte: start, $lte: end } });
    const income = monthTx
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    // Total balance = all-time income - all-time expenses
    const allTx = await Transaction.find({ userId: req.user._id });
    const totalIncome = allTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = allTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    res.json({
      income,
      expenses,
      savings: income - expenses,
      totalBalance: totalIncome - totalExpenses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/categories?month=4&year=2024
router.get('/categories', protect, async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    res.json(result.map((r) => ({ category: r._id, total: r.total })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/trend (last 6 months)
router.get('/trend', protect, async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      });
    }

    const trend = await Promise.all(
      months.map(async ({ month, year, label }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        const txs = await Transaction.find({ userId: req.user._id, date: { $gte: start, $lte: end } });
        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { label, income, expenses };
      })
    );

    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

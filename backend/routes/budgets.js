const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const protect = require('../middleware/auth');

// GET /api/budgets?month=4&year=2024
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const budgets = await Budget.find({ userId: req.user._id, month, year });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/budgets (upsert)
router.post('/', protect, async (req, res) => {
  try {
    const { category, limit, month, year } = req.body;
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    if (!category || !limit)
      return res.status(400).json({ message: 'Category and limit are required.' });

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month: m, year: y },
      { limit: Number(limit) },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });
    await budget.deleteOne();
    res.json({ message: 'Budget deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

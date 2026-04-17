const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/auth');

// GET /api/settings
router.get('/', protect, (req, res) => {
  res.json(req.user.notificationPrefs);
});

// PUT /api/settings
router.put('/', protect, async (req, res) => {
  try {
    const { budgetAlerts, spendingNotifs, weeklySummary } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notificationPrefs: { budgetAlerts, spendingNotifs, weeklySummary } },
      { new: true }
    ).select('-passwordHash');
    res.json(user.notificationPrefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

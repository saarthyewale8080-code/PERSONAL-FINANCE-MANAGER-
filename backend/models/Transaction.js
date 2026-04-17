const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Travel', 'Grocery', 'Utilities', 'Medical', 'Education', 'Entertainment', 'Salary', 'Other'],
    },
    description: { type: String, default: '', trim: true },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);

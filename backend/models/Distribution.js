const mongoose = require('mongoose');

const assignedSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  customers: [
    {
      FirstName: { type: String },
      Phone: { type: String },
      Notes: { type: String },
    }
  ],
  count: { type: Number, default: 0 },
});

const distributionSchema = new mongoose.Schema({
  filename: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  uploadedAt: { type: Date, default: Date.now },
  totalCustomers: { type: Number, default: 0 },
  assignments: [assignedSchema],
}, { timestamps: true });

module.exports = mongoose.model('Distribution', distributionSchema);

const express = require('express');
const router = express.Router();
const Distribution = require('../models/Distribution');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, filename, agentId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (filename) filter.filename = { $regex: filename, $options: 'i' };
    if (startDate || endDate) {
      filter.uploadedAt = {};
      if (startDate) filter.uploadedAt.$gte = new Date(startDate);
      if (endDate) filter.uploadedAt.$lte = new Date(endDate);
    }

    if (agentId) {
      filter['assignments.agent'] = agentId;
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const docs = await Distribution.find(filter)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const agentIds = new Set();
    const adminIds = new Set();
    docs.forEach(d => {
      d.assignments.forEach(a => agentIds.add(String(a.agent)));
      if (d.uploadedBy) adminIds.add(String(d.uploadedBy));
    });

    const agents = await Agent.find({ _id: { $in: Array.from(agentIds) } }).select('name email');
    const admins = await Admin.find({ _id: { $in: Array.from(adminIds) } }).select('email');

    const agentMap = {};
    agents.forEach(a => { agentMap[String(a._id)] = a; });
    const adminMap = {};
    admins.forEach(a => { adminMap[String(a._id)] = a; });

    const results = docs.map(d => ({
      id: d._id,
      filename: d.filename,
      uploadedAt: d.uploadedAt,
      totalCustomers: d.totalCustomers,
      uploadedBy: d.uploadedBy ? adminMap[String(d.uploadedBy)] || { id: d.uploadedBy } : null,
      assignments: d.assignments.map(a => ({
        agent: agentMap[String(a.agent)] || { id: a.agent },
        count: a.count,
        customers: a.customers,
      })),
    }));

    res.json({ success: true, page: parseInt(page), limit: parseInt(limit), results });
  } catch (err) {
    console.error('Get Distributions Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch distributions.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Distribution.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Distribution not found.' });

    const agentIds = doc.assignments.map(a => a.agent);
    const agents = await Agent.find({ _id: { $in: agentIds } }).select('name email');
    const agentMap = {};
    agents.forEach(a => { agentMap[String(a._id)] = a; });

    const admin = doc.uploadedBy ? await Admin.findById(doc.uploadedBy).select('email') : null;

    const result = {
      id: doc._id,
      filename: doc.filename,
      uploadedAt: doc.uploadedAt,
      totalCustomers: doc.totalCustomers,
      uploadedBy: admin,
      assignments: doc.assignments.map(a => ({
        agent: agentMap[String(a.agent)] || { id: a.agent },
        count: a.count,
        customers: a.customers,
      })),
    };

    res.json({ success: true, distribution: result });
  } catch (err) {
    console.error('Get Distribution Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch distribution.' });
  }
});

module.exports = router;

// Agents API keeps everything behind auth so we do not leak data.
const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const authenticateToken = require('../middleware/auth');

// Protect every route instead of sprinkling middleware per handler.
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    // Latest agents first keeps the dashboard feeling up to date.
    const agents = await Agent.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error('Get Agents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents.',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    res.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Get Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent.',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Keep field validation server-side even if the UI checks it.
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, mobile, password) are required.',
      });
    }

    // Email is treated as unique so the first match wins.
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(409).json({
        success: false,
        message: 'Agent with this email already exists.',
      });
    }

    // Hard cap acts as a lightweight licensing guard.
    const agentCount = await Agent.countDocuments();
    if (agentCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Agent limit reached (maximum 5 agents allowed).',
      });
    }

    // Use the model to handle hashing and timestamps.
    const agent = new Agent({
      name,
      email,
      mobile,
      password,
    });

    await agent.save();

    const agentData = agent.toObject();
    delete agentData.password;

    res.status(201).json({
      success: true,
      message: 'Agent created successfully.',
      agent: agentData,
    });
  } catch (error) {
    console.error('Create Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent.',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, mobile, isActive } = req.body;

    // Build an update object to avoid overwriting existing values with null.
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    res.json({
      success: true,
      message: 'Agent updated successfully.',
      agent,
    });
  } catch (error) {
    console.error('Update Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent.',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent.',
    });
  }
});

module.exports = router;
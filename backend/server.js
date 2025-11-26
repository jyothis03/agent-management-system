// Bootstrap environment variables before anything else runs.
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Route modules stay grouped here so it is easy to see what the API exposes.
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const uploadRoutes = require('./routes/upload');
const distributionRoutes = require('./routes/distributions');

const app = express();

// Global middleware stack — order matters, so we keep it explicit.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Establish the Mongo connection up-front so any later errors bubble fast.
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// API namespaces are mounted here; easier to scan during reviews.
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/distributions', distributionRoutes);

// Simple readiness probe for uptime monitoring.
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error.',
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
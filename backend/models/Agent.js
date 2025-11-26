// Agent accounts mirror admins but track assignments directly.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number with country code is required'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  // Customers remain embedded so each agent sees their own list fast.
  assignedCustomers: [
    {
      FirstName: { type: String },
      Phone: { type: String },
      Notes: { type: String },
      assignedAt: { type: Date, default: Date.now },
    }
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Auto-hash new or changed passwords.
agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

agentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Agent', agentSchema);
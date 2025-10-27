const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  college: { type: String, required: true, uppercase: true  },
  avatarUrl: { type: String },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);
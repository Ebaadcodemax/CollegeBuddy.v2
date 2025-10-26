const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  type: { type: String, enum: ['private'], default: 'private' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);

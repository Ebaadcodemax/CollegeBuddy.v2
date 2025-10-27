const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered it
  type: { type: String, enum: ['message','mention','invite'], default: 'message' },
  data: { type: Object }, 
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);

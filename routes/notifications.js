const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', ensureAuth, async (req, res) => {
  const meId = req.session.user.id;
  const notifications = await Notification.find({ user: meId }).sort('-createdAt').limit(50).populate('actor', 'name avatarUrl');
  res.json(notifications);
});

router.post('/:id/read', ensureAuth, async (req, res) => {
  const meId = req.session.user.id;
  await Notification.updateOne({ _id: req.params.id, user: meId }, { $set: { read: true }});
  res.json({ ok: true });
});

router.post('/markChatRead', ensureAuth, async (req, res) => {
  const meId = req.session.user.id;
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ ok: false, error: 'chatId required' });

  await Notification.updateMany({ user: meId, 'data.chatId': chatId, read: false }, { $set: { read: true }});
  res.json({ ok: true });
});

router.post('/markAllRead', ensureAuth, async (req, res) => {
  const meId = req.session.user.id;
  await Notification.updateMany({ user: meId, read: false }, { $set: { read: true }});
  res.json({ ok: true });
});

module.exports = router;

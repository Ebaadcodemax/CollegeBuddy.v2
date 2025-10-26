// routes/chat.js
const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');


router.get('/', ensureAuth, async (req, res) => {
  try {
    const me = req.session.user;
    const filter = req.query.filter || 'college'; // default mode

    let users = [];

    if (filter === 'all') {
      users = await User.find({ _id: { $ne: me.id } });
    } else {
      users = await User.find({ college: me.college, _id: { $ne: me.id } });
    }

    // Log to verify
    console.log('Filter:', filter, '| Users found:', users.length);

    res.render('chat', { me, users, filter });
  } catch (err) {
    console.error('⚠️ Error loading chat dashboard:', err);
    res.status(500).send('Error loading chat dashboard');
  }
});

// GET /chat/user/:userId - find or create private chat, redirect to chat window
router.get('/user/:userId', ensureAuth, async (req, res) => {
  const meId = req.session.user.id;
  const otherId = req.params.userId;

  if (meId === otherId) return res.redirect('/chat');

  // Search for a private chat between the two members
  let chat = await Chat.findOne({
    type: 'private',
    members: { $all: [meId, otherId], $size: 2 }
  });

  if (!chat) {
    chat = await Chat.create({ type: 'private', members: [meId, otherId] });
  }

  res.redirect(`/chat/${chat._id}`);
});

// GET /chat/:chatId - open chat window and load last messages
router.get('/:chatId', ensureAuth, async (req, res) => {
  const me = req.session.user;
  const chatId = req.params.chatId;

  const chat = await Chat.findById(chatId).populate('members', 'name email');
  if (!chat) return res.redirect('/chat');

  // Ensure the user is part of this chat
  const isMember = chat.members.some(m => m._id.toString() === me.id);
  if (!isMember) return res.redirect('/chat');

  const messages = await Message.find({ chat: chatId }).sort('createdAt').limit(100).populate('sender', 'name');

  res.render('chatWindow', { me, chat, messages }); // views/chatWindow.ejs
});

module.exports = router;

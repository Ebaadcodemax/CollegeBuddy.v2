require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Models
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const Notification = require('./models/Notification');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'collegebuddysecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
  })
);


const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const profileRoutes = require('./routes/profile');
const notificationsRoutes = require('./routes/notifications'); // new

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/upload', uploadRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationsRoutes); 

app.get('/', (req, res) => res.redirect('/auth/login'));

const onlineUsers = new Map(); 

io.on('connection', (socket) => {
  console.log('🟢 socket connected', socket.id);

  
  socket.on('register', (userId) => {
    if (!userId) return;
    socket.userId = String(userId);
    const set = onlineUsers.get(socket.userId) || new Set();
    set.add(socket.id);
    onlineUsers.set(socket.userId, set);

    socket.join(`user_${socket.userId}`);
    console.log(`➡️ registered socket ${socket.id} for user ${socket.userId}`);
  });

  socket.on('joinChat', (chatId) => {
    if (!chatId) return;
    socket.join(`chat_${chatId}`);
  
  });

  
  socket.on('sendMessage', async ({ chatId, text, imageUrl, type }, ack) => {
    try {
      if (!socket.userId) {
        if (typeof ack === 'function') ack({ success: false, error: 'not-registered' });
        return;
      }

      const messageData = {
        chat: chatId,
        sender: socket.userId,
        text: text || '',
        imageUrl: imageUrl || null,
        type: type || (imageUrl ? 'image' : 'text')
      };


      const msg = await Message.create(messageData);

 
      await Chat.findByIdAndUpdate(chatId, { latestMessage: msg._id }).catch(() => { });


      const msgPop = await msg.populate('sender', 'name avatarUrl');

  
      socket.to(`chat_${chatId}`).emit('message', msgPop);
      
      socket.emit('message-saved', msgPop);
      if (typeof ack === 'function') ack({ success: true, message: msgPop });

  
      const chat = await Chat.findById(chatId).populate('members', '_id');
      if (chat && chat.members && chat.members.length) {
        const recipients = chat.members
          .map(m => String(m._id))
          .filter(id => id !== String(socket.userId));

        const preview = (messageData.type === 'text' && messageData.text)
          ? (messageData.text.length > 80 ? messageData.text.slice(0, 80) + '…' : messageData.text)
          : (messageData.type === 'image' ? '📷 Image' : '');

        const notifs = recipients.map(rId => ({
          user: rId,
          actor: socket.userId,
          type: 'message',
          data: { chatId, preview },
          read: false
        }));

        if (notifs.length) {
          const created = await Notification.insertMany(notifs);

          for (const n of created) {
            io.to(`user_${String(n.user)}`).emit('notification', {
              id: n._id,
              actor: n.actor,
              type: n.type,
              data: n.data,
              createdAt: n.createdAt
            });
          }
        }
      }
    } catch (err) {
      console.error('sendMessage error', err);
      socket.emit('message-error', { error: 'send-failed' });
      if (typeof ack === 'function') ack({ success: false });
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId && onlineUsers.has(userId)) {
      const set = onlineUsers.get(userId);
      set.delete(socket.id);
      if (set.size === 0) onlineUsers.delete(userId);
      else onlineUsers.set(userId, set);
    }
    console.log('🔴 socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

require('dotenv').config();


const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = new Server(server)



mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


  app.use(express.urlencoded({ extended: true })); 
app.use(express.json());                        
app.use(express.static(path.join(__dirname, 'public'))); 
app.set('view engine', 'ejs');                 

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

app.get('/', (req, res) => {
  res.redirect('/auth/login');

});

app.get('/chat',(req,res)=>{
  res.redirect('/chat')
})

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// inside your app.js where io is created
const Message = require('./models/Message');
const Chat = require('./models/Chat');

// map userId -> socketId(s)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 socket connected', socket.id);

  // client should emit 'register' after connecting with their userId
  socket.on('register', (userId) => {
    // allow multiple sockets per user
    const set = onlineUsers.get(userId) || new Set();
    set.add(socket.id);
    onlineUsers.set(userId, set);
    socket.userId = userId;
    // optional: emit presence to others
  });

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    // optional: emit 'user-joined' to room
  });

  socket.on('sendMessage', async ({ chatId, text }) => {
    try {
      if (!socket.userId) return;
      const msg = await Message.create({
        chat: chatId,
        sender: socket.userId,
        text
      });
      // update latestMessage on Chat
      await Chat.findByIdAndUpdate(chatId, { latestMessage: msg._id });

      const msgPop = await msg.populate('sender', 'name');

      // emit to everyone in chat room
     socket.to(chatId).emit('message', msgPop);

    } catch (err) {
      console.error('sendMessage error', err);
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
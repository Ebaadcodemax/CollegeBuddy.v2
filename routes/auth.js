const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

router.get('/register', (req, res) => {
  res.render('register'); // views/register.ejs
});


router.post('/register', async (req, res) => {
  const { name, email, password, college } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.send('User already exists. <a href="/auth/login">Login</a>');

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash: hashed, college });
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Register error:', err);
    res.send('Error registering user');
  }
});

router.get('/login', (req, res) => {
  res.render('login'); 
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.send('No user found. <a href="/auth/register">Register</a>');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.send('Invalid password');


    req.session.user = {
      id: user._id,
      name: user.name,
      college: user.college
    };
    
    res.redirect('/chat');
  } catch (err) {
    console.error('Login error:', err);
    res.send('Error logging in');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;